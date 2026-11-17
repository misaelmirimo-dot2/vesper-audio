import Dexie, { type Table } from 'dexie';
import type {
  DownloadEntry,
  NormalizedTrack,
  PlaylistItem,
} from '../types/music.ts';
import type { YouTubeSearchResult } from './api.ts';
import type { LocalMediaRecord } from '../utils/localMedia.ts';

export interface FavoriteRecord {
  trackId: string;
  track: NormalizedTrack;
  addedAt: string;
}

export interface HistoryRecord {
  id?: number;
  trackId: string;
  track: NormalizedTrack;
  playedAt: string;
  playbackPosition: number;
}

export interface SavedCollectionRecord {
  key: string; // `${collectionType}:${providerId}`
  collectionType: 'album' | 'artist';
  providerId: string;
  name: string;
  subtitle: string;
  artworkUrl: string;
  savedAt: string;
}

export interface PreferenceRecord {
  key: string;
  value: string;
}

export interface RecentSearchRecord {
  query: string;
  searchedAt: string;
}

export interface LocalMediaBlobRecord {
  id: string;
  blob: Blob;
}

export interface YouTubeFavoriteRecord {
  videoId: string;
  video: YouTubeSearchResult;
  addedAt: string;
}

export interface YouTubePlaylistItem {
  id: string;
  name: string;
  description: string;
  videos: YouTubeSearchResult[];
  createdAt: string;
  updatedAt: string;
  syncedToCloud: boolean;
}

export interface LinkedFolderRecord {
  id: string;
  name: string;
  handle: unknown;
  linkedAt: string;
  lastSyncedAt: string;
  lastImportedCount: number;
}

class VesperOfflineDatabase extends Dexie {
  favorites!: Table<FavoriteRecord, string>;
  playlists!: Table<PlaylistItem, string>;
  history!: Table<HistoryRecord, number>;
  savedCollections!: Table<SavedCollectionRecord, string>;
  downloads!: Table<DownloadEntry, string>;
  preferences!: Table<PreferenceRecord, string>;
  recentSearches!: Table<RecentSearchRecord, string>;
  localMedia!: Table<LocalMediaRecord, string>;
  localMediaBlobs!: Table<LocalMediaBlobRecord, string>;
  youtubeFavorites!: Table<YouTubeFavoriteRecord, string>;
  youtubePlaylists!: Table<YouTubePlaylistItem, string>;
  linkedFolders!: Table<LinkedFolderRecord, string>;

  constructor() {
    super('vesper-offline-db');
    this.version(1).stores({
      favorites: 'trackId, addedAt',
      playlists: 'id, updatedAt',
      history: '++id, trackId, playedAt',
      savedCollections: 'key, collectionType, providerId',
      downloads: 'trackId, status, downloadedAt',
      preferences: 'key',
      recentSearches: 'query, searchedAt',
    });
    this.version(2).stores({
      favorites: 'trackId, addedAt',
      playlists: 'id, updatedAt',
      history: '++id, trackId, playedAt',
      savedCollections: 'key, collectionType, providerId',
      downloads: 'trackId, status, downloadedAt',
      preferences: 'key',
      recentSearches: 'query, searchedAt',
      localMedia: 'id, mediaType, addedAt',
      localMediaBlobs: 'id',
      youtubeFavorites: 'videoId, addedAt',
      youtubePlaylists: 'id, updatedAt',
    });
    this.version(3).stores({
      favorites: 'trackId, addedAt',
      playlists: 'id, updatedAt',
      history: '++id, trackId, playedAt',
      savedCollections: 'key, collectionType, providerId',
      downloads: 'trackId, status, downloadedAt',
      preferences: 'key',
      recentSearches: 'query, searchedAt',
      localMedia: 'id, mediaType, addedAt',
      localMediaBlobs: 'id',
      youtubeFavorites: 'videoId, addedAt',
      youtubePlaylists: 'id, updatedAt',
      linkedFolders: 'id',
    });
  }
}

export const offlineDb = new VesperOfflineDatabase();
