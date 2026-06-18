import { AuthResponse, MediaItem, Library, SystemInfo, UserDto } from '../types/jellyfin';

const APP_NAME = 'JellyfinMobile';
const APP_VERSION = '1.0.0';
const DEVICE_NAME = 'Mobile';
const DEVICE_ID = 'jellyfin-mobile-001';

class JellyfinApi {
  private serverUrl: string = '';
  private accessToken: string = '';

  private buildAuthHeader(token?: string): string {
    const parts = [
      `Client="${APP_NAME}"`,
      `Device="${DEVICE_NAME}"`,
      `DeviceId="${DEVICE_ID}"`,
      `Version="${APP_VERSION}"`,
    ];
    if (token) parts.push(`Token="${token}"`);
    return `MediaBrowser ${parts.join(', ')}`;
  }

  private buildUrl(path: string): string {
    const base = this.serverUrl.replace(/\/$/, '');
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  private async apiFetch<T>(
    path: string,
    options: { method?: string; body?: any; useToken?: boolean } = {}
  ): Promise<T> {
    const url = this.buildUrl(path);
    const { method = 'GET', body, useToken = true } = options;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Authorization': this.buildAuthHeader(useToken ? this.accessToken : undefined),
    };
    if (body) headers['Content-Type'] = 'application/json';

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const contentType = res.headers.get('content-type') || '';

    if (!res.ok || !contentType.includes('json')) {
      const text = await res.text().catch(() => '');
      const err: any = new Error(
        !res.ok
          ? `Request failed with status ${res.status}`
          : `Expected JSON but got ${contentType || 'unknown'}`
      );
      err.status = res.status;
      err.statusText = res.statusText;
      err.body = text;
      err.url = url;
      err.contentType = contentType;
      throw err;
    }

    return res.json();
  }

  initialize(serverUrl: string, accessToken?: string) {
    this.serverUrl = serverUrl.replace(/\/$/, '');
    if (accessToken !== undefined) this.accessToken = accessToken;
  }

  async testConnection(serverUrl: string): Promise<{ ServerName: string; Version: string }> {
    const base = serverUrl.replace(/\/$/, '');
    const url = `${base}/System/Info/Public`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw { status: res.status, statusText: res.statusText, body: text.slice(0, 500) };
      }
      return res.json();
    } catch (e: any) {
      clearTimeout(timeout);
      if (e?.status) throw e;
      if (e?.name === 'AbortError') throw { message: `Timed out connecting to ${base}` };
      throw { message: e?.message || 'Unknown error', type: 'network' };
    }
  }

  async login(serverUrl: string, username: string, password: string): Promise<AuthResponse> {
    this.initialize(serverUrl);
    const url = this.buildUrl('Users/AuthenticateByName');

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': this.buildAuthHeader(),
    };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ Username: username, Pw: password }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err: any = new Error(`Login failed — server returned ${res.status}`);
      err.status = res.status;
      err.body = text;
      err.url = url;
      throw err;
    }

    const data = await res.json();
    this.accessToken = data.AccessToken;
    this.initialize(serverUrl, this.accessToken);
    return data;
  }

  async getServerInfo(): Promise<SystemInfo> {
    return this.apiFetch<SystemInfo>('System/Info');
  }

  async getCurrentUser(): Promise<UserDto> {
    return this.apiFetch<UserDto>('Users/Me');
  }

  async getLibraries(): Promise<Library[]> {
    const data = await this.apiFetch<{ Items: Library[] }>('Library/MediaFolders', { method: 'GET', body: undefined });
    return data.Items || [];
  }

  async getMediaItems(parentId?: string): Promise<MediaItem[]> {
    const params: any = {
      Fields: 'PrimaryImageAspectRatio,UserData,BasicSyncInfo',
      Recursive: true,
      Limit: 50,
      ImageTypeLimit: 1,
      EnableImageTypes: 'Primary,Backdrop,Thumb',
    };
    if (parentId) params.ParentId = parentId;
    const qs = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    const data = await this.apiFetch<{ Items: MediaItem[] }>(`Items?${qs}`);
    return data.Items || [];
  }

  async getLatestMedia(parentId?: string): Promise<MediaItem[]> {
    const params: any = {
      Fields: 'PrimaryImageAspectRatio,UserData,BasicSyncInfo',
      Limit: 20,
      ImageTypeLimit: 1,
      EnableImageTypes: 'Primary',
    };
    if (parentId) params.ParentId = parentId;
    const qs = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    return this.apiFetch<MediaItem[]>(`Items/Latest?${qs}`);
  }

  async getContinueWatching(): Promise<MediaItem[]> {
    const data = await this.apiFetch<{ Items: MediaItem[] }>('Users/Items/Resume', { body: undefined });
    return data.Items || [];
  }

  getImageUrl(itemId: string, type: 'Primary' | 'Backdrop' | 'Thumb' = 'Primary', quality = 90): string {
    const base = this.buildUrl(`Items/${itemId}/Images/${type}?Quality=${quality}`);
    if (!this.accessToken) return base;
    return `${base}&Token=${this.accessToken}`;
  }

  getStreamUrl(itemId: string): string {
    const base = this.buildUrl(`Videos/${itemId}/stream?Static=true`);
    if (!this.accessToken) return base;
    return `${base}&Token=${this.accessToken}`;
  }

  getAccessToken(): string {
    return this.accessToken;
  }

  getServerUrl(): string {
    return this.serverUrl;
  }
}

export const jellyfinApi = new JellyfinApi();
