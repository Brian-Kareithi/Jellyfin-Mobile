export interface LoginRequest {
  Username: string;
  Password: string;
}

export interface AuthResponse {
  User: User;
  AccessToken: string;
  ServerId: string;
}

export interface User {
  Id: string;
  Name: string;
  PrimaryImageTag?: string;
}

export interface MediaItem {
  Id: string;
  Name: string;
  Overview?: string;
  Type: 'Movie' | 'Series' | 'Episode' | 'Audio' | 'Folder';
  ImageTags?: {
    Primary?: string;
  };
  UserData?: {
    Played: boolean;
    PlaybackPositionTicks: number;
  };
  ParentId?: string;
  RunTimeTicks?: number;
  CommunityRating?: number;
  SeriesName?: string;
  SeasonNumber?: number;
  EpisodeNumber?: number;
  NumberOfEpisodes?: number;
  ProductionYear?: number;
}

export interface Library {
  Id: string;
  Name: string;
  Type: string;
  CollectionType?: string;
  ImageTags?: {
    Primary?: string;
  };
}

export interface SystemInfo {
  Id: string;
  SystemName: string;
  ServerName: string;
  Version: string;
  OperatingSystem: string;
  ProductName?: string;
}

export interface UserDto {
  Id: string;
  Name: string;
  ServerId?: string;
  PrimaryImageTag?: string;
  HasPassword?: boolean;
  LastLoginDate?: string;
  LastActivityDate?: string;
  Configuration?: {
    AudioLanguagePreference?: string;
    SubtitleMode?: string;
    SubtitleLanguagePreference?: string;
  };
  Policy?: {
    IsAdministrator?: boolean;
    RemoteClientBitrateLimit?: number;
    EnableMediaPlayback?: boolean;
  };
}

export interface AppState {
  serverUrl: string | null;
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
}
