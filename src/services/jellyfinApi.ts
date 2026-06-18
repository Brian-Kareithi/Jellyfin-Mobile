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
    const url = `${base}/System/Info/Public`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw { status: res.status, statusText: res.statusText, body: text.slice(0, 500) };
      }

      const data = await res.json();
      this.initialize(serverUrl);
      return data;
    } catch (e: any) {
      clearTimeout(timeout);
      if (e?.status) throw e;
      if (e?.name === 'AbortError') throw { message: 'Request timed out after 10 seconds' };
      if (e?.message?.includes('network') || e?.message?.includes('NETWORK')) {
        throw { message: e.message, type: 'network' };
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
