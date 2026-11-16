export type LicenseCode =
  | 'CC BY'
  | 'CC BY-SA'
  | 'CC BY-NC'
  | 'CC BY-NC-SA'
  | 'CC BY-ND'
  | 'CC BY-NC-ND'
  | 'JAMENDO_PRO'
  | 'LOCAL_FILE'
  | 'UNKNOWN';

export interface LicenseEvaluation {
  licenseType: LicenseCode;
  licenseUrl: string;
  audiodownloadAllowed: boolean;
  globalDownloadsEnabled: boolean;
  commercialModeRequested: boolean;
  offlineDownloadPermitted: boolean;
  commercialUsePermitted: boolean;
  derivativesPermitted: boolean;
  redistributionPermitted: boolean;
  attributionRequired: boolean;
  blockedReason: string | null;
  summary: string;
  checkedAt: string;
}

export interface NormalizedTrack {
  id: string;
  provider: 'jamendo' | 'local';
  providerTrackId: string;
  title: string;
  artistName: string;
  artistId: string;
  albumName: string;
  albumId: string;
  artworkUrl: string;
  duration: number;
  genre: string;
  tags: string[];
  releaseDate: string | null;
  isInstrumental: boolean;
  streamingUrl: string;
  downloadUrl: string | null;
  originalTrackUrl: string;
  audiodownloadAllowed: boolean;
  licenseType: LicenseCode;
  licenseUrl: string;
  licenseEvaluation: LicenseEvaluation;
  sourceMode: 'jamendo-live' | 'development-catalog' | 'local-device';
  audioFormat?: string;
}

export interface NormalizedArtist {
  id: string;
  name: string;
  imageUrl: string;
  website?: string;
  joinDate?: string;
  shareUrl: string;
  trackCount?: number;
  genre?: string;
  bio?: string;
}

export interface NormalizedAlbum {
  id: string;
  name: string;
  artistId: string;
  artistName: string;
  artworkUrl: string;
  releaseDate: string | null;
  shareUrl: string;
  genre?: string;
  trackCount?: number;
}

export interface PlaylistItem {
  id: string;
  name: string;
  description: string;
  artworkUrl: string | null;
  tracks: NormalizedTrack[];
  createdAt: string;
  updatedAt: string;
  syncedToCloud: boolean;
}

export interface DownloadEntry {
  trackId: string;
  track: NormalizedTrack;
  status: 'downloading' | 'completed' | 'failed' | 'cancelled' | 'expired';
  progress: number;
  fileSizeBytes: number;
  licenseType: LicenseCode;
  licenseVerifiedAt: string;
  downloadedAt: string;
  errorMessage?: string;
}

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  profileImage: string | null;
  bio: string;
  commercialUseMode: boolean;
}
