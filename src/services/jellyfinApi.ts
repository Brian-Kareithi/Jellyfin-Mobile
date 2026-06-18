import axios, { AxiosInstance } from 'axios';
import { AuthResponse, MediaItem, Library, SystemInfo, UserDto } from '../types/jellyfin';

class JellyfinApi {
  private api: AxiosInstance | null = null;
  private serverUrl: string = '';
  private accessToken: string = '';

  initialize(serverUrl: string, accessToken?: string) {
    this.serverUrl = serverUrl.replace(/\/$/, '');
    this.accessToken = accessToken || '';

    this.api = axios.create({
      baseURL: `${this.serverUrl}`,
      headers: {
        'Accept': 'application/json',
        'X-Emby-Authorization': `MediaBrowser Client="JellyfinMobile", Device="Mobile", DeviceId="jellyfin-mobile-001", Version="1.0.0"`,
        ...(this.accessToken && { 'X-Emby-Token': this.accessToken })
      },
      timeout: 30000,
    });
  }

  async testConnection(serverUrl: string): Promise<{ ServerName: string; Version: string }> {
    const base = serverUrl.replace(/\/$/, '');
    const TIMEOUT_MS = 10000;

    const fetchWithTimeout = (url: string, timeoutMs: number) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id));
    };

    try {
      const res = await fetchWithTimeout(base, TIMEOUT_MS);
      if (!res.ok && res.status !== 404 && res.status !== 401) {
        throw { status: res.status, statusText: res.statusText };
      }
      this.initialize(serverUrl);
      return { ServerName: 'Jellyfin Server', Version: '' };
    } catch (e: any) {
      if (e?.status) {
        throw { message: `Server responded with HTTP ${e.status}. Proceeding to login...`, type: 'warn' };
      }
      if (e?.name === 'AbortError') {
        throw { message: `Timed out connecting to ${base}.\n\nIf the original Jellyfin app works, try entering the EXACT same URL you use there (including port number).\n\nIf behind Tailscale, ensure:\n- Tailscale is connected\n- Use the Tailscale IP (100.x.x.x:8096) or MagicDNS name` };
      }
      const msg = (e?.message || '').toLowerCase();
      if (msg.includes('network') || msg.includes('dns') || msg.includes('enotfound') || msg.includes('econnrefused') || msg.includes('err_name') || msg.includes('fetch')) {
        throw { message: `Cannot reach ${base}.\nCheck:\n1. Server is running\n2. Correct URL (try the IP address)\n3. Port is open\n4. Network/VPN is connected\n\nDetail: ${e.message}`, type: 'network' };
      }
      throw { message: e?.message || 'Unknown error', type: 'unknown' };
    }
  }

  async getServerInfo(): Promise<SystemInfo> {
    const response = await this.api!.get('/System/Info');
    return response.data;
  }

  async getCurrentUser(): Promise<UserDto> {
    const response = await this.api!.get('/Users/Me');
    return response.data;
  }

  async login(serverUrl: string, username: string, password: string): Promise<AuthResponse> {
    this.initialize(serverUrl);

    const response = await this.api!.post('/Users/AuthenticateByName', {
      Username: username,
      Pw: password
    });

    if (response.data.AccessToken) {
      this.accessToken = response.data.AccessToken;
      this.initialize(serverUrl, this.accessToken);
    }

    return response.data;
  }

  async getLibraries(): Promise<Library[]> {
    const response = await this.api!.get('/Library/MediaFolders', {
      params: {
        IsHidden: false
      }
    });
    return response.data.Items || [];
  }

  async getMediaItems(parentId?: string): Promise<MediaItem[]> {
    const params: any = {
      Fields: 'PrimaryImageAspectRatio,UserData,BasicSyncInfo',
      Recursive: true,
      Limit: 50,
      ImageTypeLimit: 1,
      EnableImageTypes: 'Primary,Backdrop,Thumb'
    };

    if (parentId) {
      params.ParentId = parentId;
    }

    const response = await this.api!.get('/Items', { params });
    return response.data.Items;
  }

  async getLatestMedia(parentId?: string): Promise<MediaItem[]> {
    const params: any = {
      Fields: 'PrimaryImageAspectRatio,UserData,BasicSyncInfo',
      Limit: 20,
      ImageTypeLimit: 1,
      EnableImageTypes: 'Primary'
    };

    if (parentId) {
      params.ParentId = parentId;
    }

    const response = await this.api!.get('/Items/Latest', { params });
    return response.data;
  }

  async getContinueWatching(): Promise<MediaItem[]> {
    const response = await this.api!.get('/Users/Items/Resume', {
      params: {
        Limit: 20,
        Fields: 'PrimaryImageAspectRatio,UserData,BasicSyncInfo'
      }
    });
    return response.data.Items;
  }

  getImageUrl(itemId: string, type: 'Primary' | 'Backdrop' | 'Thumb' = 'Primary', quality = 90): string {
    const base = `${this.serverUrl}/Items/${itemId}/Images/${type}?Quality=${quality}`;
    if (!this.accessToken) return base;
    return `${base}&Token=${this.accessToken}`;
  }

  getStreamUrl(itemId: string): string {
    const base = `${this.serverUrl}/Videos/${itemId}/stream?Static=true`;
    if (!this.accessToken) return base;
    return `${base}&Token=${this.accessToken}`;
  }

  getAccessToken(): string {
    return this.accessToken;
  }

  getServerUrl(): string {
    return this.serverUrl;
  }

  isInitialized(): boolean {
    return this.api !== null;
  }
}

export const jellyfinApi = new JellyfinApi();
