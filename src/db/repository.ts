import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  apiLogs,
  appSettings,
  downloadRecords,
  favorites,
  listeningHistory,
  playlists,
  playlistTracks,
  savedCollections,
  tracks,
  users,
  youtubeFavorites,
  youtubePlaylistItems,
  youtubePlaylists,
} from './schema.ts';
import type { NormalizedTrack } from '../types/music.ts';
import type { YouTubeSearchResult } from '../../server/youtube/services.ts';
import { validateTrackLicense } from '../../server/jamendo/licenseValidator.ts';

export async function getGlobalSettings() {
  try {
    const rows = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, 'default'))
      .limit(1);

    if (rows[0]) return rows[0];

    const inserted = await db
      .insert(appSettings)
      .values({
        key: 'default',
        downloadsEnabledGlobally: true,
        apiCacheTtlSeconds: 300,
        commercialModeEnforced: false,
        featureFlags: {
          offlineDownloads: true,
          mediaSessionApi: true,
          commercialModeToggle: true,
        },
      })
      .onConflictDoNothing()
      .returning();

    if (inserted[0]) return inserted[0];

    const retry = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, 'default'))
      .limit(1);

    return (
      retry[0] ?? {
        id: 1,
        key: 'default',
        downloadsEnabledGlobally: true,
        apiCacheTtlSeconds: 300,
        commercialModeEnforced: false,
        featureFlags: {},
        updatedAt: new Date(),
      }
    );
  } catch (error) {
    console.error('Database error in getGlobalSettings:', error);
    return {
      id: 1,
      key: 'default',
      downloadsEnabledGlobally: true,
      apiCacheTtlSeconds: 300,
      commercialModeEnforced: false,
      featureFlags: {},
      updatedAt: new Date(),
    };
  }
}

export async function updateGlobalSettings(updates: {
  downloadsEnabledGlobally?: boolean;
  apiCacheTtlSeconds?: number;
  commercialModeEnforced?: boolean;
  featureFlags?: Record<string, boolean>;
}) {
  try {
    await getGlobalSettings();
    const result = await db
      .update(appSettings)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(appSettings.key, 'default'))
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database error in updateGlobalSettings:', error);
    throw new Error('Failed to update application settings.', { cause: error });
  }
}

export async function recordApiLog(
  eventType: string,
  endpoint: string,
  statusCode: number,
  detail: string
) {
  try {
    await db.insert(apiLogs).values({
      eventType,
      endpoint,
      statusCode,
      detail,
    });
  } catch (error) {
    console.error('Failed to write api_logs entry:', error);
  }
}

export async function upsertTrackRecord(track: NormalizedTrack) {
  try {
    const rows = await db
      .insert(tracks)
      .values({
        provider: track.provider,
        providerTrackId: track.providerTrackId,
        title: track.title,
        artistName: track.artistName,
        artistId: track.artistId,
        albumName: track.albumName,
        albumId: track.albumId,
        artworkUrl: track.artworkUrl,
        duration: track.duration,
        genre: track.genre,
        tags: track.tags,
        releaseDate: track.releaseDate,
        isInstrumental: track.isInstrumental,
        streamingUrl: track.streamingUrl,
        downloadUrl: track.downloadUrl,
        originalTrackUrl: track.originalTrackUrl,
        downloadAllowed: track.audiodownloadAllowed,
        licenseType: track.licenseType,
        licenseUrl: track.licenseUrl,
        licenseSummary: track.licenseEvaluation.summary,
        lastVerifiedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [tracks.provider, tracks.providerTrackId],
        set: {
          title: track.title,
          artistName: track.artistName,
          artworkUrl: track.artworkUrl,
          streamingUrl: track.streamingUrl,
          downloadUrl: track.downloadUrl,
          downloadAllowed: track.audiodownloadAllowed,
          licenseType: track.licenseType,
          licenseUrl: track.licenseUrl,
          licenseSummary: track.licenseEvaluation.summary,
          lastVerifiedAt: new Date(),
        },
      })
      .returning();

    return rows[0];
  } catch (error) {
    console.error('Database error in upsertTrackRecord:', error);
    throw new Error('Failed to persist track metadata.', { cause: error });
  }
}

function dbTrackToNormalized(
  row: typeof tracks.$inferSelect,
  globalDownloadsEnabled: boolean,
  commercialModeRequested: boolean
): NormalizedTrack {
  const evaluation = validateTrackLicense({
    audiodownloadAllowed: row.downloadAllowed,
    downloadUrl: row.downloadUrl,
    licenseUrl: row.licenseUrl,
    licenseName: row.licenseType,
    globalDownloadsEnabled,
    commercialModeRequested,
    checkedAt: row.lastVerifiedAt.toISOString(),
  });

  return {
    id: row.providerTrackId,
    provider: 'jamendo',
    providerTrackId: row.providerTrackId,
    title: row.title,
    artistName: row.artistName,
    artistId: row.artistId,
    albumName: row.albumName ?? 'Single',
    albumId: row.albumId ?? '',
    artworkUrl: row.artworkUrl ?? '/covers/cover_nocturne_synth.jpg',
    duration: row.duration,
    genre: row.genre ?? 'Independent',
    tags: Array.isArray(row.tags) ? row.tags : [],
    releaseDate: row.releaseDate ?? null,
    isInstrumental: row.isInstrumental,
    streamingUrl: row.streamingUrl,
    downloadUrl: evaluation.offlineDownloadPermitted ? row.downloadUrl : null,
    originalTrackUrl: row.originalTrackUrl,
    audiodownloadAllowed: row.downloadAllowed,
    licenseType: evaluation.licenseType,
    licenseUrl: evaluation.licenseUrl,
    licenseEvaluation: evaluation,
    sourceMode: row.streamingUrl.startsWith('/api/demo-audio')
      ? 'development-catalog'
      : 'jamendo-live',
  };
}

export async function getUserLibrary(
  userId: number,
  globalDownloadsEnabled: boolean,
  commercialModeRequested: boolean
) {
  try {
    const [favRows, colRows, histRows, dlRows] = await Promise.all([
      db
        .select({ track: tracks, favCreatedAt: favorites.createdAt })
        .from(favorites)
        .innerJoin(tracks, eq(favorites.trackId, tracks.id))
        .where(eq(favorites.userId, userId))
        .orderBy(desc(favorites.createdAt)),
      db
        .select()
        .from(savedCollections)
        .where(eq(savedCollections.userId, userId))
        .orderBy(desc(savedCollections.createdAt)),
      db
        .select({
          track: tracks,
          playedAt: listeningHistory.playedAt,
          playbackPosition: listeningHistory.playbackPosition,
        })
        .from(listeningHistory)
        .innerJoin(tracks, eq(listeningHistory.trackId, tracks.id))
        .where(eq(listeningHistory.userId, userId))
        .orderBy(desc(listeningHistory.playedAt))
        .limit(25),
      db
        .select({
          track: tracks,
          record: downloadRecords,
        })
        .from(downloadRecords)
        .innerJoin(tracks, eq(downloadRecords.trackId, tracks.id))
        .where(eq(downloadRecords.userId, userId))
        .orderBy(desc(downloadRecords.createdAt)),
    ]);

    return {
      favorites: favRows.map((r) =>
        dbTrackToNormalized(
          r.track,
          globalDownloadsEnabled,
          commercialModeRequested
        )
      ),
      savedAlbums: colRows.filter((c) => c.collectionType === 'album'),
      savedArtists: colRows.filter((c) => c.collectionType === 'artist'),
      history: histRows.map((r) => ({
        track: dbTrackToNormalized(
          r.track,
          globalDownloadsEnabled,
          commercialModeRequested
        ),
        playedAt: r.playedAt.toISOString(),
        playbackPosition: r.playbackPosition,
      })),
      downloads: dlRows.map((r) => ({
        trackId: r.track.providerTrackId,
        track: dbTrackToNormalized(
          r.track,
          globalDownloadsEnabled,
          commercialModeRequested
        ),
        status: r.record.localDownloadStatus,
        fileSizeBytes: r.record.fileSizeBytes,
        licenseType: r.record.licenseType,
        licenseVerifiedAt: r.record.licenseVerifiedAt.toISOString(),
        downloadedAt: r.record.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error('Database error in getUserLibrary:', error);
    throw new Error('Failed to load personal music library.', { cause: error });
  }
}

export async function toggleFavoriteTrack(
  userId: number,
  track: NormalizedTrack,
  action: 'add' | 'remove'
) {
  try {
    const dbTrack = await upsertTrackRecord(track);
    if (action === 'add') {
      await db
        .insert(favorites)
        .values({ userId, trackId: dbTrack.id })
        .onConflictDoNothing();
    } else {
      await db
        .delete(favorites)
        .where(
          and(eq(favorites.userId, userId), eq(favorites.trackId, dbTrack.id))
        );
    }
    return true;
  } catch (error) {
    console.error('Database error in toggleFavoriteTrack:', error);
    throw new Error('Failed to update favorites.', { cause: error });
  }
}

export async function toggleSavedCollection(
  userId: number,
  payload: {
    collectionType: 'album' | 'artist';
    providerId: string;
    name: string;
    subtitle?: string;
    artworkUrl?: string;
  },
  action: 'add' | 'remove'
) {
  try {
    if (action === 'add') {
      await db
        .insert(savedCollections)
        .values({
          userId,
          collectionType: payload.collectionType,
          providerId: payload.providerId,
          name: payload.name,
          subtitle: payload.subtitle ?? '',
          artworkUrl: payload.artworkUrl ?? '',
        })
        .onConflictDoNothing();
    } else {
      await db
        .delete(savedCollections)
        .where(
          and(
            eq(savedCollections.userId, userId),
            eq(savedCollections.collectionType, payload.collectionType),
            eq(savedCollections.providerId, payload.providerId)
          )
        );
    }
    return true;
  } catch (error) {
    console.error('Database error in toggleSavedCollection:', error);
    throw new Error('Failed to update saved library collection.', {
      cause: error,
    });
  }
}

export async function getUserPlaylists(
  userId: number,
  globalDownloadsEnabled: boolean,
  commercialModeRequested: boolean
) {
  try {
    const userPlaylists = await db
      .select()
      .from(playlists)
      .where(eq(playlists.userId, userId))
      .orderBy(desc(playlists.updatedAt));

    const enriched = await Promise.all(
      userPlaylists.map(async (pl) => {
        const items = await db
          .select({ track: tracks, pt: playlistTracks })
          .from(playlistTracks)
          .innerJoin(tracks, eq(playlistTracks.trackId, tracks.id))
          .where(eq(playlistTracks.playlistId, pl.id))
          .orderBy(playlistTracks.position);

        return {
          id: String(pl.id),
          name: pl.name,
          description: pl.description ?? '',
          artworkUrl:
            pl.artworkUrl || items[0]?.track.artworkUrl || null,
          tracks: items.map((i) =>
            dbTrackToNormalized(
              i.track,
              globalDownloadsEnabled,
              commercialModeRequested
            )
          ),
          createdAt: pl.createdAt.toISOString(),
          updatedAt: pl.updatedAt.toISOString(),
          syncedToCloud: true,
        };
      })
    );

    return enriched;
  } catch (error) {
    console.error('Database error in getUserPlaylists:', error);
    throw new Error('Failed to load playlists.', { cause: error });
  }
}

export async function createPlaylistRecord(
  userId: number,
  name: string,
  description?: string
) {
  try {
    const rows = await db
      .insert(playlists)
      .values({
        userId,
        name: name.trim(),
        description: description?.trim() ?? '',
      })
      .returning();
    return rows[0];
  } catch (error) {
    console.error('Database error in createPlaylistRecord:', error);
    throw new Error('Failed to create playlist.', { cause: error });
  }
}

export async function updatePlaylistRecord(
  userId: number,
  playlistId: number,
  updates: { name?: string; description?: string }
) {
  try {
    const rows = await db
      .update(playlists)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)))
      .returning();
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database error in updatePlaylistRecord:', error);
    throw new Error('Failed to update playlist.', { cause: error });
  }
}

export async function deletePlaylistRecord(userId: number, playlistId: number) {
  try {
    const rows = await db
      .delete(playlists)
      .where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)))
      .returning();
    return Boolean(rows[0]);
  } catch (error) {
    console.error('Database error in deletePlaylistRecord:', error);
    throw new Error('Failed to delete playlist.', { cause: error });
  }
}

export async function addTrackToPlaylistRecord(
  userId: number,
  playlistId: number,
  track: NormalizedTrack
) {
  try {
    const owned = await db
      .select()
      .from(playlists)
      .where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)))
      .limit(1);

    if (!owned[0]) return null;

    const dbTrack = await upsertTrackRecord(track);
    const existing = await db
      .select()
      .from(playlistTracks)
      .where(eq(playlistTracks.playlistId, playlistId));

    const nextPos = existing.length;
    await db.insert(playlistTracks).values({
      playlistId,
      trackId: dbTrack.id,
      position: nextPos,
    });

    await db
      .update(playlists)
      .set({
        updatedAt: new Date(),
        artworkUrl: owned[0].artworkUrl || track.artworkUrl,
      })
      .where(eq(playlists.id, playlistId));

    return true;
  } catch (error) {
    console.error('Database error in addTrackToPlaylistRecord:', error);
    throw new Error('Failed to add track to playlist.', { cause: error });
  }
}

export async function removeTrackFromPlaylistRecord(
  userId: number,
  playlistId: number,
  providerTrackId: string
) {
  try {
    const owned = await db
      .select()
      .from(playlists)
      .where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)))
      .limit(1);
    if (!owned[0]) return false;

    const targetTrack = await db
      .select()
      .from(tracks)
      .where(eq(tracks.providerTrackId, providerTrackId))
      .limit(1);
    if (!targetTrack[0]) return false;

    await db
      .delete(playlistTracks)
      .where(
        and(
          eq(playlistTracks.playlistId, playlistId),
          eq(playlistTracks.trackId, targetTrack[0].id)
        )
      );

    return true;
  } catch (error) {
    console.error('Database error in removeTrackFromPlaylistRecord:', error);
    throw new Error('Failed to remove track from playlist.', { cause: error });
  }
}

export async function reorderPlaylistTracksRecord(
  userId: number,
  playlistId: number,
  orderedProviderTrackIds: string[]
) {
  try {
    const owned = await db
      .select()
      .from(playlists)
      .where(and(eq(playlists.id, playlistId), eq(playlists.userId, userId)))
      .limit(1);
    if (!owned[0]) return false;

    const currentItems = await db
      .select({ pt: playlistTracks, track: tracks })
      .from(playlistTracks)
      .innerJoin(tracks, eq(playlistTracks.trackId, tracks.id))
      .where(eq(playlistTracks.playlistId, playlistId));

    for (let idx = 0; idx < orderedProviderTrackIds.length; idx++) {
      const pid = orderedProviderTrackIds[idx];
      const match = currentItems.find((i) => i.track.providerTrackId === pid);
      if (match) {
        await db
          .update(playlistTracks)
          .set({ position: idx })
          .where(eq(playlistTracks.id, match.pt.id));
      }
    }
    return true;
  } catch (error) {
    console.error('Database error in reorderPlaylistTracksRecord:', error);
    throw new Error('Failed to reorder playlist tracks.', { cause: error });
  }
}

export async function recordListeningHistoryItem(
  userId: number,
  track: NormalizedTrack,
  playbackPosition = 0
) {
  try {
    const dbTrack = await upsertTrackRecord(track);
    await db.insert(listeningHistory).values({
      userId,
      trackId: dbTrack.id,
      playbackPosition,
    });
    return true;
  } catch (error) {
    console.error('Database error in recordListeningHistoryItem:', error);
    throw new Error('Failed to record listening history.', { cause: error });
  }
}

export async function upsertDownloadRecord(
  userId: number,
  track: NormalizedTrack,
  status: string,
  fileSizeBytes: number
) {
  try {
    const dbTrack = await upsertTrackRecord(track);
    const rows = await db
      .insert(downloadRecords)
      .values({
        userId,
        trackId: dbTrack.id,
        localDownloadStatus: status,
        fileSizeBytes,
        licenseType: track.licenseType,
        licenseVerifiedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [downloadRecords.userId, downloadRecords.trackId],
        set: {
          localDownloadStatus: status,
          fileSizeBytes,
          licenseType: track.licenseType,
          licenseVerifiedAt: new Date(),
        },
      })
      .returning();
    return rows[0];
  } catch (error) {
    console.error('Database error in upsertDownloadRecord:', error);
    throw new Error('Failed to save download record.', { cause: error });
  }
}

export async function deleteDownloadRecord(
  userId: number,
  providerTrackId: string
) {
  try {
    const targetTrack = await db
      .select()
      .from(tracks)
      .where(eq(tracks.providerTrackId, providerTrackId))
      .limit(1);
    if (!targetTrack[0]) return false;

    await db
      .delete(downloadRecords)
      .where(
        and(
          eq(downloadRecords.userId, userId),
          eq(downloadRecords.trackId, targetTrack[0].id)
        )
      );
    return true;
  } catch (error) {
    console.error('Database error in deleteDownloadRecord:', error);
    throw new Error('Failed to delete download record.', { cause: error });
  }
}

export async function getAdminOverview() {
  try {
    const [
      userRows,
      trackCountRows,
      playlistCountRows,
      downloadCountRows,
      recentLogs,
      settings,
    ] = await Promise.all([
      db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          commercialUseMode: users.commercialUseMode,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(20),
      db.select({ count: sql<number>`count(*)::int` }).from(tracks),
      db.select({ count: sql<number>`count(*)::int` }).from(playlists),
      db.select({ count: sql<number>`count(*)::int` }).from(downloadRecords),
      db
        .select()
        .from(apiLogs)
        .orderBy(desc(apiLogs.createdAt))
        .limit(25),
      getGlobalSettings(),
    ]);

    return {
      stats: {
        registeredUsers: userRows.length,
        cachedTracks: trackCountRows[0]?.count ?? 0,
        totalPlaylists: playlistCountRows[0]?.count ?? 0,
        authorizedDownloads: downloadCountRows[0]?.count ?? 0,
      },
      users: userRows,
      logs: recentLogs,
      settings,
    };
  } catch (error) {
    console.error('Database error in getAdminOverview:', error);
    throw new Error('Failed to load administration overview.', {
      cause: error,
    });
  }
}

function rowToYouTubeResult(row: {
  videoId: string;
  title: string;
  channelTitle: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  durationLabel: string;
  viewCountLabel: string;
  category: string;
  embedUrl: string;
  watchUrl: string;
}): YouTubeSearchResult {
  const category =
    row.category === 'live' || row.category === 'video' ? row.category : 'music';
  return {
    videoId: row.videoId,
    title: row.title,
    channelTitle: row.channelTitle,
    description: row.description,
    thumbnailUrl: row.thumbnailUrl,
    publishedAt: row.publishedAt,
    durationLabel: row.durationLabel,
    viewCountLabel: row.viewCountLabel,
    category,
    embedUrl: row.embedUrl,
    watchUrl: row.watchUrl,
  };
}

export async function getUserYouTubeLibrary(userId: number) {
  try {
    const [favRows, playlistRows] = await Promise.all([
      db
        .select()
        .from(youtubeFavorites)
        .where(eq(youtubeFavorites.userId, userId))
        .orderBy(desc(youtubeFavorites.createdAt)),
      db
        .select()
        .from(youtubePlaylists)
        .where(eq(youtubePlaylists.userId, userId))
        .orderBy(desc(youtubePlaylists.updatedAt)),
    ]);

    const playlistsWithItems = await Promise.all(
      playlistRows.map(async (pl) => {
        const items = await db
          .select()
          .from(youtubePlaylistItems)
          .where(eq(youtubePlaylistItems.playlistId, pl.id))
          .orderBy(youtubePlaylistItems.position);

        return {
          id: String(pl.id),
          name: pl.name,
          description: pl.description,
          videos: items.map(rowToYouTubeResult),
          createdAt: pl.createdAt.toISOString(),
          updatedAt: pl.updatedAt.toISOString(),
          syncedToCloud: true,
        };
      })
    );

    return {
      favorites: favRows.map(rowToYouTubeResult),
      playlists: playlistsWithItems,
    };
  } catch (error) {
    console.error('Database error in getUserYouTubeLibrary:', error);
    throw new Error('Failed to load YouTube library.', { cause: error });
  }
}

export async function toggleYouTubeFavoriteRecord(
  userId: number,
  video: YouTubeSearchResult,
  action: 'add' | 'remove'
) {
  try {
    if (action === 'add') {
      await db
        .insert(youtubeFavorites)
        .values({
          userId,
          videoId: video.videoId,
          title: video.title,
          channelTitle: video.channelTitle,
          description: video.description || '',
          thumbnailUrl: video.thumbnailUrl,
          publishedAt: video.publishedAt || '',
          durationLabel: video.durationLabel || 'Video',
          viewCountLabel: video.viewCountLabel || 'YouTube',
          category: video.category || 'music',
          embedUrl: video.embedUrl,
          watchUrl: video.watchUrl,
        })
        .onConflictDoNothing();
    } else {
      await db
        .delete(youtubeFavorites)
        .where(
          and(
            eq(youtubeFavorites.userId, userId),
            eq(youtubeFavorites.videoId, video.videoId)
          )
        );
    }
    return true;
  } catch (error) {
    console.error('Database error in toggleYouTubeFavoriteRecord:', error);
    throw new Error('Failed to update YouTube favorite.', { cause: error });
  }
}

export async function createYouTubePlaylistRecord(
  userId: number,
  name: string,
  description = ''
) {
  try {
    const rows = await db
      .insert(youtubePlaylists)
      .values({
        userId,
        name: name.trim(),
        description: description.trim(),
      })
      .returning();
    return rows[0];
  } catch (error) {
    console.error('Database error in createYouTubePlaylistRecord:', error);
    throw new Error('Failed to create YouTube playlist.', { cause: error });
  }
}

export async function deleteYouTubePlaylistRecord(
  userId: number,
  playlistId: number
) {
  try {
    const rows = await db
      .delete(youtubePlaylists)
      .where(
        and(
          eq(youtubePlaylists.id, playlistId),
          eq(youtubePlaylists.userId, userId)
        )
      )
      .returning();
    return Boolean(rows[0]);
  } catch (error) {
    console.error('Database error in deleteYouTubePlaylistRecord:', error);
    throw new Error('Failed to delete YouTube playlist.', { cause: error });
  }
}

export async function addYouTubePlaylistItemRecord(
  userId: number,
  playlistId: number,
  video: YouTubeSearchResult
) {
  try {
    const owned = await db
      .select()
      .from(youtubePlaylists)
      .where(
        and(
          eq(youtubePlaylists.id, playlistId),
          eq(youtubePlaylists.userId, userId)
        )
      )
      .limit(1);
    if (!owned[0]) return null;

    const existing = await db
      .select()
      .from(youtubePlaylistItems)
      .where(eq(youtubePlaylistItems.playlistId, playlistId));

    await db
      .insert(youtubePlaylistItems)
      .values({
        playlistId,
        videoId: video.videoId,
        title: video.title,
        channelTitle: video.channelTitle,
        description: video.description || '',
        thumbnailUrl: video.thumbnailUrl,
        publishedAt: video.publishedAt || '',
        durationLabel: video.durationLabel || 'Video',
        viewCountLabel: video.viewCountLabel || 'YouTube',
        category: video.category || 'music',
        embedUrl: video.embedUrl,
        watchUrl: video.watchUrl,
        position: existing.length,
      })
      .onConflictDoNothing();

    await db
      .update(youtubePlaylists)
      .set({ updatedAt: new Date() })
      .where(eq(youtubePlaylists.id, playlistId));

    return true;
  } catch (error) {
    console.error('Database error in addYouTubePlaylistItemRecord:', error);
    throw new Error('Failed to add video to YouTube playlist.', { cause: error });
  }
}

export async function removeYouTubePlaylistItemRecord(
  userId: number,
  playlistId: number,
  videoId: string
) {
  try {
    const owned = await db
      .select()
      .from(youtubePlaylists)
      .where(
        and(
          eq(youtubePlaylists.id, playlistId),
          eq(youtubePlaylists.userId, userId)
        )
      )
      .limit(1);
    if (!owned[0]) return false;

    await db
      .delete(youtubePlaylistItems)
      .where(
        and(
          eq(youtubePlaylistItems.playlistId, playlistId),
          eq(youtubePlaylistItems.videoId, videoId)
        )
      );

    await db
      .update(youtubePlaylists)
      .set({ updatedAt: new Date() })
      .where(eq(youtubePlaylists.id, playlistId));

    return true;
  } catch (error) {
    console.error('Database error in removeYouTubePlaylistItemRecord:', error);
    throw new Error('Failed to remove video from YouTube playlist.', {
      cause: error,
    });
  }
}
