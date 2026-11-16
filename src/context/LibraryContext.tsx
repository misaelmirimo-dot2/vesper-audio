import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type {
  DownloadEntry,
  NormalizedTrack,
  PlaylistItem,
} from '../types/music.ts';
import {
  offlineDb,
  type HistoryRecord,
  type SavedCollectionRecord,
  type YouTubePlaylistItem,
} from '../lib/offlineDb.ts';
import {
  cancelTrackDownload,
  deleteLocalMediaFile,
  downloadAuthorizedTrack,
  getStorageEstimate,
  removeDownloadedAudio,
  saveLocalMediaFile,
} from '../lib/offlineStorage.ts';
import { apiFetch, type YouTubeSearchResult } from '../lib/api.ts';
import { useAuth } from './AuthContext.tsx';
import { reorderList } from '../utils/playerLogic.ts';
import type { LocalMediaRecord } from '../utils/localMedia.ts';

interface LibraryContextValue {
  favorites: NormalizedTrack[];
  playlists: PlaylistItem[];
  history: HistoryRecord[];
  savedCollections: SavedCollectionRecord[];
  downloads: DownloadEntry[];
  localMedia: LocalMediaRecord[];
  youtubeFavorites: YouTubeSearchResult[];
  youtubePlaylists: YouTubePlaylistItem[];
  recentSearches: string[];
  commercialUseMode: boolean;
  simulatedOffline: boolean;
  storageInfo: { usageBytes: number; quotaBytes: number; persisted: boolean };
  isFavorite: (trackId: string) => boolean;
  isYouTubeFavorite: (videoId: string) => boolean;
  isSavedCollection: (type: 'album' | 'artist', id: string) => boolean;
  getDownloadEntry: (trackId: string) => DownloadEntry | undefined;
  toggleFavorite: (track: NormalizedTrack) => Promise<void>;
  toggleYouTubeFavorite: (video: YouTubeSearchResult) => Promise<void>;
  createYouTubePlaylist: (
    name: string,
    description?: string
  ) => Promise<YouTubePlaylistItem>;
  deleteYouTubePlaylist: (id: string) => Promise<void>;
  addVideoToYouTubePlaylist: (
    playlistId: string,
    video: YouTubeSearchResult
  ) => Promise<void>;
  removeVideoFromYouTubePlaylist: (
    playlistId: string,
    videoId: string
  ) => Promise<void>;
  importLocalFiles: (files: File[]) => Promise<{
    imported: LocalMediaRecord[];
    errors: string[];
  }>;
  removeLocalMedia: (id: string) => Promise<void>;
  toggleSaveCollection: (item: {
    collectionType: 'album' | 'artist';
    providerId: string;
    name: string;
    subtitle: string;
    artworkUrl: string;
  }) => Promise<void>;
  createPlaylist: (name: string, description?: string) => Promise<PlaylistItem>;
  renamePlaylist: (id: string, name: string, description?: string) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: string, track: NormalizedTrack) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  reorderPlaylistTracks: (playlistId: string, fromIdx: number, toIdx: number) => Promise<void>;
  recordPlay: (track: NormalizedTrack) => Promise<void>;
  startDownload: (track: NormalizedTrack) => Promise<void>;
  cancelDownload: (trackId: string) => void;
  removeDownload: (trackId: string) => Promise<void>;
  addRecentSearch: (query: string) => Promise<void>;
  setCommercialUseMode: (enabled: boolean) => Promise<void>;
  setSimulatedOffline: (enabled: boolean) => Promise<void>;
  refreshStorageStats: () => Promise<void>;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { token, updateProfile } = useAuth();
  const [favorites, setFavorites] = useState<NormalizedTrack[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [savedCollections, setSavedCollections] = useState<SavedCollectionRecord[]>([]);
  const [downloads, setDownloads] = useState<DownloadEntry[]>([]);
  const [localMedia, setLocalMedia] = useState<LocalMediaRecord[]>([]);
  const [youtubeFavorites, setYoutubeFavorites] = useState<YouTubeSearchResult[]>([]);
  const [youtubePlaylists, setYoutubePlaylists] = useState<YouTubePlaylistItem[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [commercialUseMode, setCommercialUseModeState] = useState(false);
  const [simulatedOffline, setSimulatedOfflineState] = useState(false);
  const [storageInfo, setStorageInfo] = useState({
    usageBytes: 0,
    quotaBytes: 0,
    persisted: false,
  });

  const refreshStorageStats = useCallback(async () => {
    const est = await getStorageEstimate();
    setStorageInfo(est);
  }, []);

  const loadLocalState = useCallback(async () => {
    const [
      favs,
      pls,
      hist,
      cols,
      dls,
      locals,
      ytFavs,
      ytPls,
      searches,
      commPref,
      offPref,
    ] = await Promise.all([
      offlineDb.favorites.orderBy('addedAt').reverse().toArray(),
      offlineDb.playlists.orderBy('updatedAt').reverse().toArray(),
      offlineDb.history.orderBy('playedAt').reverse().limit(30).toArray(),
      offlineDb.savedCollections.toArray(),
      offlineDb.downloads.orderBy('downloadedAt').reverse().toArray(),
      offlineDb.localMedia.orderBy('addedAt').reverse().toArray(),
      offlineDb.youtubeFavorites.orderBy('addedAt').reverse().toArray(),
      offlineDb.youtubePlaylists.orderBy('updatedAt').reverse().toArray(),
      offlineDb.recentSearches.orderBy('searchedAt').reverse().limit(8).toArray(),
      offlineDb.preferences.get('commercialUseMode'),
      offlineDb.preferences.get('simulatedOffline'),
    ]);

    setFavorites(favs.map((f) => f.track));
    setPlaylists(pls);
    setHistory(hist);
    setSavedCollections(cols);
    setDownloads(dls);
    setLocalMedia(locals);
    setYoutubeFavorites(ytFavs.map((y) => y.video));
    setYoutubePlaylists(ytPls);
    setRecentSearches(searches.map((s) => s.query));
    setCommercialUseModeState(commPref?.value === 'true');
    setSimulatedOfflineState(offPref?.value === 'true');
    await refreshStorageStats();
  }, [refreshStorageStats]);

  // Initial load from IndexedDB (works offline immediately)
  useEffect(() => {
    void loadLocalState();
  }, [loadLocalState]);

  // Sync with PostgreSQL backend when user signs in
  useEffect(() => {
    if (!token) return;
    let active = true;
    (async () => {
      try {
        const [libData, plData, ytData] = await Promise.all([
          apiFetch<{
            favorites: NormalizedTrack[];
            savedAlbums: Array<{
              providerId: string;
              name: string;
              subtitle: string | null;
              artworkUrl: string | null;
              createdAt: string;
            }>;
            savedArtists: Array<{
              providerId: string;
              name: string;
              subtitle: string | null;
              artworkUrl: string | null;
              createdAt: string;
            }>;
          }>('/api/library', { token }),
          apiFetch<{ playlists: PlaylistItem[] }>('/api/playlists', { token }),
          apiFetch<{
            favorites: YouTubeSearchResult[];
            playlists: YouTubePlaylistItem[];
          }>('/api/youtube/library', { token }),
        ]);

        if (!active) return;

        for (const t of libData.favorites) {
          await offlineDb.favorites.put({
            trackId: t.id,
            track: t,
            addedAt: new Date().toISOString(),
          });
        }
        for (const pl of plData.playlists) {
          await offlineDb.playlists.put(pl);
        }
        for (const alb of libData.savedAlbums) {
          await offlineDb.savedCollections.put({
            key: `album:${alb.providerId}`,
            collectionType: 'album',
            providerId: alb.providerId,
            name: alb.name,
            subtitle: alb.subtitle ?? '',
            artworkUrl: alb.artworkUrl ?? '',
            savedAt: alb.createdAt,
          });
        }
        for (const art of libData.savedArtists) {
          await offlineDb.savedCollections.put({
            key: `artist:${art.providerId}`,
            collectionType: 'artist',
            providerId: art.providerId,
            name: art.name,
            subtitle: art.subtitle ?? '',
            artworkUrl: art.artworkUrl ?? '',
            savedAt: art.createdAt,
          });
        }
        for (const yv of ytData.favorites) {
          await offlineDb.youtubeFavorites.put({
            videoId: yv.videoId,
            video: yv,
            addedAt: new Date().toISOString(),
          });
        }
        for (const ypl of ytData.playlists) {
          await offlineDb.youtubePlaylists.put(ypl);
        }

        await loadLocalState();
      } catch {
        // Offline or network hiccup: keep local Dexie data intact
      }
    })();
    return () => {
      active = false;
    };
  }, [token, loadLocalState]);

  const isFavorite = useCallback(
    (trackId: string) => favorites.some((t) => t.id === trackId),
    [favorites]
  );

  const isYouTubeFavorite = useCallback(
    (videoId: string) => youtubeFavorites.some((v) => v.videoId === videoId),
    [youtubeFavorites]
  );

  const isSavedCollection = useCallback(
    (type: 'album' | 'artist', id: string) =>
      savedCollections.some(
        (c) => c.collectionType === type && c.providerId === id
      ),
    [savedCollections]
  );

  const getDownloadEntry = useCallback(
    (trackId: string) => downloads.find((d) => d.trackId === trackId),
    [downloads]
  );

  const toggleFavorite = async (track: NormalizedTrack) => {
    const exists = favorites.some((t) => t.id === track.id);
    if (exists) {
      await offlineDb.favorites.delete(track.id);
      setFavorites((prev) => prev.filter((t) => t.id !== track.id));
      if (token && track.provider !== 'local') {
        apiFetch(`/api/library/favorites/${track.id}`, {
          method: 'DELETE',
          token,
        }).catch(() => {});
      }
    } else {
      await offlineDb.favorites.put({
        trackId: track.id,
        track,
        addedAt: new Date().toISOString(),
      });
      setFavorites((prev) => [track, ...prev]);
      if (token && track.provider !== 'local') {
        apiFetch('/api/library/favorites', {
          method: 'POST',
          token,
          body: JSON.stringify({ trackId: track.id }),
        }).catch(() => {});
      }
    }
  };

  const toggleYouTubeFavorite = async (video: YouTubeSearchResult) => {
    const exists = youtubeFavorites.some((v) => v.videoId === video.videoId);
    if (exists) {
      await offlineDb.youtubeFavorites.delete(video.videoId);
      setYoutubeFavorites((prev) =>
        prev.filter((v) => v.videoId !== video.videoId)
      );
      if (token) {
        apiFetch(`/api/youtube/favorites/${encodeURIComponent(video.videoId)}`, {
          method: 'DELETE',
          token,
        }).catch(() => {});
      }
    } else {
      await offlineDb.youtubeFavorites.put({
        videoId: video.videoId,
        video,
        addedAt: new Date().toISOString(),
      });
      setYoutubeFavorites((prev) => [video, ...prev]);
      if (token) {
        apiFetch('/api/youtube/favorites', {
          method: 'POST',
          token,
          body: JSON.stringify({ video }),
        }).catch(() => {});
      }
    }
  };

  const createYouTubePlaylist = async (name: string, description = '') => {
    const now = new Date().toISOString();
    let id = `yt-local-${Date.now()}`;
    let synced = false;

    if (token) {
      try {
        const res = await apiFetch<{ playlist: { id: number } }>(
          '/api/youtube/playlists',
          {
            method: 'POST',
            token,
            body: JSON.stringify({ name, description }),
          }
        );
        id = String(res.playlist.id);
        synced = true;
      } catch {
        // Offline fallback
      }
    }

    const item: YouTubePlaylistItem = {
      id,
      name: name.trim(),
      description: description.trim(),
      videos: [],
      createdAt: now,
      updatedAt: now,
      syncedToCloud: synced,
    };

    await offlineDb.youtubePlaylists.put(item);
    setYoutubePlaylists((prev) => [item, ...prev]);
    return item;
  };

  const deleteYouTubePlaylist = async (id: string) => {
    await offlineDb.youtubePlaylists.delete(id);
    setYoutubePlaylists((prev) => prev.filter((p) => p.id !== id));
    if (token && !id.startsWith('yt-local-')) {
      apiFetch(`/api/youtube/playlists/${id}`, {
        method: 'DELETE',
        token,
      }).catch(() => {});
    }
  };

  const addVideoToYouTubePlaylist = async (
    playlistId: string,
    video: YouTubeSearchResult
  ) => {
    const existing = await offlineDb.youtubePlaylists.get(playlistId);
    if (!existing) return;
    if (existing.videos.some((v) => v.videoId === video.videoId)) return;

    const updated: YouTubePlaylistItem = {
      ...existing,
      videos: [...existing.videos, video],
      updatedAt: new Date().toISOString(),
    };
    await offlineDb.youtubePlaylists.put(updated);
    setYoutubePlaylists((prev) =>
      prev.map((p) => (p.id === playlistId ? updated : p))
    );

    if (token && !playlistId.startsWith('yt-local-')) {
      apiFetch(`/api/youtube/playlists/${playlistId}/items`, {
        method: 'POST',
        token,
        body: JSON.stringify({ video }),
      }).catch(() => {});
    }
  };

  const removeVideoFromYouTubePlaylist = async (
    playlistId: string,
    videoId: string
  ) => {
    const existing = await offlineDb.youtubePlaylists.get(playlistId);
    if (!existing) return;

    const updated: YouTubePlaylistItem = {
      ...existing,
      videos: existing.videos.filter((v) => v.videoId !== videoId),
      updatedAt: new Date().toISOString(),
    };
    await offlineDb.youtubePlaylists.put(updated);
    setYoutubePlaylists((prev) =>
      prev.map((p) => (p.id === playlistId ? updated : p))
    );

    if (token && !playlistId.startsWith('yt-local-')) {
      apiFetch(
        `/api/youtube/playlists/${playlistId}/items/${encodeURIComponent(videoId)}`,
        {
          method: 'DELETE',
          token,
        }
      ).catch(() => {});
    }
  };

  const importLocalFiles = async (files: File[]) => {
    const imported: LocalMediaRecord[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const rec = await saveLocalMediaFile(file);
        imported.push(rec);
      } catch (err) {
        errors.push(
          err instanceof Error ? err.message : `Unable to import ${file.name}`
        );
      }
    }

    if (imported.length > 0) {
      setLocalMedia((prev) => [...imported.reverse(), ...prev]);
      await refreshStorageStats();
    }

    return { imported, errors };
  };

  const removeLocalMedia = async (id: string) => {
    await deleteLocalMediaFile(id);
    setLocalMedia((prev) => prev.filter((item) => item.id !== id));
    await refreshStorageStats();
  };

  const toggleSaveCollection = async (item: {
    collectionType: 'album' | 'artist';
    providerId: string;
    name: string;
    subtitle: string;
    artworkUrl: string;
  }) => {
    const key = `${item.collectionType}:${item.providerId}`;
    const exists = savedCollections.some((c) => c.key === key);
    if (exists) {
      await offlineDb.savedCollections.delete(key);
      setSavedCollections((prev) => prev.filter((c) => c.key !== key));
    } else {
      const record: SavedCollectionRecord = {
        key,
        ...item,
        savedAt: new Date().toISOString(),
      };
      await offlineDb.savedCollections.put(record);
      setSavedCollections((prev) => [record, ...prev]);
    }
    if (token) {
      apiFetch('/api/library/collections', {
        method: 'POST',
        token,
        body: JSON.stringify({
          ...item,
          action: exists ? 'remove' : 'add',
        }),
      }).catch(() => {});
    }
  };

  const createPlaylist = async (name: string, description = '') => {
    const now = new Date().toISOString();
    let id = `local-${Date.now()}`;
    let synced = false;

    if (token) {
      try {
        const res = await apiFetch<{ playlist: { id: number } }>(
          '/api/playlists',
          {
            method: 'POST',
            token,
            body: JSON.stringify({ name, description }),
          }
        );
        id = String(res.playlist.id);
        synced = true;
      } catch {
        // Offline fallback
      }
    }

    const item: PlaylistItem = {
      id,
      name: name.trim(),
      description: description.trim(),
      artworkUrl: null,
      tracks: [],
      createdAt: now,
      updatedAt: now,
      syncedToCloud: synced,
    };

    await offlineDb.playlists.put(item);
    setPlaylists((prev) => [item, ...prev]);
    return item;
  };

  const renamePlaylist = async (
    id: string,
    name: string,
    description?: string
  ) => {
    const existing = await offlineDb.playlists.get(id);
    if (!existing) return;
    const updated: PlaylistItem = {
      ...existing,
      name: name.trim(),
      description:
        description !== undefined ? description.trim() : existing.description,
      updatedAt: new Date().toISOString(),
    };
    await offlineDb.playlists.put(updated);
    setPlaylists((prev) => prev.map((p) => (p.id === id ? updated : p)));

    if (token && !id.startsWith('local-')) {
      apiFetch(`/api/playlists/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ name: updated.name, description: updated.description }),
      }).catch(() => {});
    }
  };

  const deletePlaylist = async (id: string) => {
    await offlineDb.playlists.delete(id);
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
    if (token && !id.startsWith('local-')) {
      apiFetch(`/api/playlists/${id}`, {
        method: 'DELETE',
        token,
      }).catch(() => {});
    }
  };

  const addTrackToPlaylist = async (
    playlistId: string,
    track: NormalizedTrack
  ) => {
    const existing = await offlineDb.playlists.get(playlistId);
    if (!existing) return;
    if (existing.tracks.some((t) => t.id === track.id)) return;

    const updated: PlaylistItem = {
      ...existing,
      artworkUrl: existing.artworkUrl || track.artworkUrl,
      tracks: [...existing.tracks, track],
      updatedAt: new Date().toISOString(),
    };
    await offlineDb.playlists.put(updated);
    setPlaylists((prev) =>
      prev.map((p) => (p.id === playlistId ? updated : p))
    );

    if (token && !playlistId.startsWith('local-') && track.provider !== 'local') {
      apiFetch(`/api/playlists/${playlistId}/tracks`, {
        method: 'POST',
        token,
        body: JSON.stringify({ trackId: track.id }),
      }).catch(() => {});
    }
  };

  const removeTrackFromPlaylist = async (
    playlistId: string,
    trackId: string
  ) => {
    const existing = await offlineDb.playlists.get(playlistId);
    if (!existing) return;

    const updated: PlaylistItem = {
      ...existing,
      tracks: existing.tracks.filter((t) => t.id !== trackId),
      updatedAt: new Date().toISOString(),
    };
    await offlineDb.playlists.put(updated);
    setPlaylists((prev) =>
      prev.map((p) => (p.id === playlistId ? updated : p))
    );

    if (token && !playlistId.startsWith('local-') && !trackId.startsWith('local-')) {
      apiFetch(`/api/playlists/${playlistId}/tracks/${trackId}`, {
        method: 'DELETE',
        token,
      }).catch(() => {});
    }
  };

  const reorderPlaylistTracks = async (
    playlistId: string,
    fromIdx: number,
    toIdx: number
  ) => {
    const existing = await offlineDb.playlists.get(playlistId);
    if (!existing) return;
    const reordered = reorderList(existing.tracks, fromIdx, toIdx);
    const updated: PlaylistItem = {
      ...existing,
      tracks: reordered,
      updatedAt: new Date().toISOString(),
    };
    await offlineDb.playlists.put(updated);
    setPlaylists((prev) =>
      prev.map((p) => (p.id === playlistId ? updated : p))
    );

    if (token && !playlistId.startsWith('local-')) {
      apiFetch(`/api/playlists/${playlistId}/tracks`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          orderedTrackIds: reordered.map((t) => t.id),
        }),
      }).catch(() => {});
    }
  };

  const recordPlay = useCallback(
    async (track: NormalizedTrack) => {
      const entry: HistoryRecord = {
        trackId: track.id,
        track,
        playedAt: new Date().toISOString(),
        playbackPosition: 0,
      };
      await offlineDb.history.add(entry);
      const latest = await offlineDb.history
        .orderBy('playedAt')
        .reverse()
        .limit(30)
        .toArray();
      setHistory(latest);

      if (token && track.provider !== 'local') {
        apiFetch('/api/history', {
          method: 'POST',
          token,
          body: JSON.stringify({ trackId: track.id, playbackPosition: 0 }),
        }).catch(() => {});
      }
    },
    [token]
  );

  const startDownload = async (track: NormalizedTrack) => {
    await downloadAuthorizedTrack({
      track,
      commercialMode: commercialUseMode,
      authToken: token,
      onProgress: (entry) => {
        setDownloads((prev) => {
          const filtered = prev.filter((d) => d.trackId !== entry.trackId);
          return [entry, ...filtered];
        });
      },
    });
    await refreshStorageStats();
  };

  const cancelDownload = (trackId: string) => {
    cancelTrackDownload(trackId);
  };

  const removeDownload = async (trackId: string) => {
    await removeDownloadedAudio(trackId);
    setDownloads((prev) => prev.filter((d) => d.trackId !== trackId));
    await refreshStorageStats();
    if (token) {
      apiFetch(`/api/downloads/${trackId}`, {
        method: 'DELETE',
        token,
      }).catch(() => {});
    }
  };

  const addRecentSearch = async (query: string) => {
    const clean = query.trim();
    if (!clean) return;
    await offlineDb.recentSearches.put({
      query: clean,
      searchedAt: new Date().toISOString(),
    });
    const list = await offlineDb.recentSearches
      .orderBy('searchedAt')
      .reverse()
      .limit(8)
      .toArray();
    setRecentSearches(list.map((r) => r.query));
  };

  const setCommercialUseMode = async (enabled: boolean) => {
    await offlineDb.preferences.put({
      key: 'commercialUseMode',
      value: enabled ? 'true' : 'false',
    });
    setCommercialUseModeState(enabled);
    if (token) {
      await updateProfile({ commercialUseMode: enabled });
    }
  };

  const setSimulatedOffline = async (enabled: boolean) => {
    await offlineDb.preferences.put({
      key: 'simulatedOffline',
      value: enabled ? 'true' : 'false',
    });
    setSimulatedOfflineState(enabled);
  };

  return (
    <LibraryContext.Provider
      value={{
        favorites,
        playlists,
        history,
        savedCollections,
        downloads,
        localMedia,
        youtubeFavorites,
        youtubePlaylists,
        recentSearches,
        commercialUseMode,
        simulatedOffline,
        storageInfo,
        isFavorite,
        isYouTubeFavorite,
        isSavedCollection,
        getDownloadEntry,
        toggleFavorite,
        toggleYouTubeFavorite,
        createYouTubePlaylist,
        deleteYouTubePlaylist,
        addVideoToYouTubePlaylist,
        removeVideoFromYouTubePlaylist,
        importLocalFiles,
        removeLocalMedia,
        toggleSaveCollection,
        createPlaylist,
        renamePlaylist,
        deletePlaylist,
        addTrackToPlaylist,
        removeTrackFromPlaylist,
        reorderPlaylistTracks,
        recordPlay,
        startDownload,
        cancelDownload,
        removeDownload,
        addRecentSearch,
        setCommercialUseMode,
        setSimulatedOffline,
        refreshStorageStats,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
};

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside LibraryProvider');
  return ctx;
}
