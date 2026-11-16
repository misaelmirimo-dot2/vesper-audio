import type {
  NormalizedAlbum,
  NormalizedArtist,
  NormalizedTrack,
} from '../../src/types/music.ts';
import {
  DEV_ALBUMS,
  DEV_ARTISTS,
  DEV_TRACK_SEEDS,
  hydrateDevTrack,
} from './catalog.ts';
import { jamendoClient } from './client.ts';
import { validateTrackLicense } from './licenseValidator.ts';

interface JamendoRawTrack {
  id: string;
  name: string;
  duration: number;
  artist_id: string;
  artist_name: string;
  album_id?: string;
  album_name?: string;
  album_image?: string;
  image?: string;
  releasedate?: string;
  audio: string;
  audiodownload?: string;
  audiodownload_allowed?: boolean;
  license_ccurl?: string;
  shareurl?: string;
  musicinfo?: {
    vocalinstrumental?: string;
    tags?: {
      genres?: string[];
      instruments?: string[];
      vartags?: string[];
    };
  };
}

interface JamendoRawArtist {
  id: string;
  name: string;
  image?: string;
  website?: string;
  joindate?: string;
  shareurl?: string;
}

interface JamendoRawAlbum {
  id: string;
  name: string;
  artist_id: string;
  artist_name: string;
  image?: string;
  releasedate?: string;
  shareurl?: string;
}

export interface ServiceOptions {
  globalDownloadsEnabled: boolean;
  commercialModeRequested: boolean;
  cacheTtlSeconds: number;
  logEvent?: (
    eventType: string,
    endpoint: string,
    statusCode: number,
    detail: string
  ) => Promise<void>;
}

const GENRES = [
  'Ambient',
  'Electronic',
  'Indie Folk',
  'Lo-Fi Beats',
  'Classical',
  'Jazz',
  'Post-Rock',
  'Chillout',
];

function normalizeLiveTrack(
  raw: JamendoRawTrack,
  opts: ServiceOptions
): NormalizedTrack {
  const genres = raw.musicinfo?.tags?.genres ?? [];
  const vartags = raw.musicinfo?.tags?.vartags ?? [];
  const tags = Array.from(new Set([...genres, ...vartags])).slice(0, 8);
  const genre = genres[0] || 'Independent';
  const audiodownloadAllowed = Boolean(raw.audiodownload_allowed);

  const evaluation = validateTrackLicense({
    audiodownloadAllowed,
    downloadUrl: audiodownloadAllowed ? raw.audiodownload : null,
    licenseUrl: raw.license_ccurl,
    globalDownloadsEnabled: opts.globalDownloadsEnabled,
    commercialModeRequested: opts.commercialModeRequested,
  });

  return {
    id: String(raw.id),
    provider: 'jamendo',
    providerTrackId: String(raw.id),
    title: raw.name || 'Untitled Track',
    artistName: raw.artist_name || 'Unknown Artist',
    artistId: String(raw.artist_id || ''),
    albumName: raw.album_name || 'Single',
    albumId: String(raw.album_id || ''),
    artworkUrl: raw.album_image || raw.image || '/covers/cover_nocturne_synth.jpg',
    duration: Number(raw.duration) || 180,
    genre,
    tags,
    releaseDate: raw.releasedate || null,
    isInstrumental: raw.musicinfo?.vocalinstrumental === 'instrumental',
    streamingUrl: raw.audio,
    downloadUrl:
      evaluation.offlineDownloadPermitted && raw.audiodownload
        ? raw.audiodownload
        : null,
    originalTrackUrl:
      raw.shareurl || `https://www.jamendo.com/track/${raw.id}`,
    audiodownloadAllowed,
    licenseType: evaluation.licenseType,
    licenseUrl: evaluation.licenseUrl,
    licenseEvaluation: evaluation,
    sourceMode: 'jamendo-live',
    audioFormat: 'mp32',
  };
}

export async function getDiscoverData(opts: ServiceOptions) {
  if (jamendoClient.isLiveConfigured) {
    try {
      const [popularRes, recentRes, instRes, vocalRes, albumsRes] =
        await Promise.allSettled([
          jamendoClient.request<{ results: JamendoRawTrack[] }>(
            '/tracks/',
            {
              order: 'popularity_total',
              limit: 10,
              include: 'licenses+musicinfo',
              audioformat: 'mp32',
            },
            opts.cacheTtlSeconds
          ),
          jamendoClient.request<{ results: JamendoRawTrack[] }>(
            '/tracks/',
            {
              order: 'releasedate_desc',
              limit: 8,
              include: 'licenses+musicinfo',
              audioformat: 'mp32',
            },
            opts.cacheTtlSeconds
          ),
          jamendoClient.request<{ results: JamendoRawTrack[] }>(
            '/tracks/',
            {
              vocalinstrumental: 'instrumental',
              order: 'popularity_week',
              limit: 6,
              include: 'licenses+musicinfo',
              audioformat: 'mp32',
            },
            opts.cacheTtlSeconds
          ),
          jamendoClient.request<{ results: JamendoRawTrack[] }>(
            '/tracks/',
            {
              vocalinstrumental: 'vocal',
              order: 'popularity_week',
              limit: 6,
              include: 'licenses+musicinfo',
              audioformat: 'mp32',
            },
            opts.cacheTtlSeconds
          ),
          jamendoClient.request<{ results: JamendoRawAlbum[] }>(
            '/albums/',
            {
              order: 'popularity_total',
              limit: 6,
            },
            opts.cacheTtlSeconds
          ),
        ]);

      const popularRaw =
        popularRes.status === 'fulfilled' ? popularRes.value.data.results : [];
      const recentRaw =
        recentRes.status === 'fulfilled' ? recentRes.value.data.results : [];
      const instRaw =
        instRes.status === 'fulfilled' ? instRes.value.data.results : [];
      const vocalRaw =
        vocalRes.status === 'fulfilled' ? vocalRes.value.data.results : [];
      const albumsRaw =
        albumsRes.status === 'fulfilled' ? albumsRes.value.data.results : [];

      if (popularRaw.length === 0 && recentRaw.length === 0) {
        const firstRejection = [
          popularRes,
          recentRes,
          instRes,
          vocalRes,
          albumsRes,
        ].find((r): r is PromiseRejectedResult => r.status === 'rejected');
        throw firstRejection?.reason ?? new Error('No live Jamendo tracks returned');
      }

      await opts.logEvent?.(
        'jamendo_discover',
        '/v3.0/tracks/',
        200,
        'Live Jamendo discovery payload fetched'
      );

      const popular = popularRaw.map((t) => normalizeLiveTrack(t, opts));
      const trending = (recentRaw.length > 0 ? recentRaw : popularRaw).map((t) =>
        normalizeLiveTrack(t, opts)
      );
      const instrumental = instRaw.map((t) => normalizeLiveTrack(t, opts));
      const vocal = vocalRaw.map((t) => normalizeLiveTrack(t, opts));
      let albums: NormalizedAlbum[] = albumsRaw.map((a) => ({
        id: String(a.id),
        name: a.name,
        artistId: String(a.artist_id),
        artistName: a.artist_name,
        artworkUrl: a.image || '/covers/cover_nocturne_synth.jpg',
        releaseDate: a.releasedate || null,
        shareUrl: a.shareurl || `https://www.jamendo.com/album/${a.id}`,
      }));

      if (albums.length === 0) {
        const seenAlbums = new Set<string>();
        for (const t of [...popular, ...trending]) {
          if (t.albumId && !seenAlbums.has(t.albumId)) {
            seenAlbums.add(t.albumId);
            albums.push({
              id: t.albumId,
              name: t.albumName,
              artistId: t.artistId,
              artistName: t.artistName,
              artworkUrl: t.artworkUrl,
              releaseDate: t.releaseDate,
              shareUrl: `https://www.jamendo.com/album/${t.albumId}`,
            });
            if (albums.length >= 6) break;
          }
        }
      }

      return {
        sourceMode: 'jamendo-live' as const,
        featured: (popular.length > 0 ? popular : trending).slice(0, 4),
        popular,
        trending,
        instrumental,
        vocal,
        albums,
        genres: GENRES,
      };
    } catch (err) {
      await opts.logEvent?.(
        'jamendo_error',
        '/v3.0/tracks/',
        502,
        err instanceof Error ? err.message : 'Jamendo request failed'
      );
    }
  }

  const all = DEV_TRACK_SEEDS.map((s) =>
    hydrateDevTrack(
      s,
      opts.globalDownloadsEnabled,
      opts.commercialModeRequested
    )
  );
  const byPopularity = [...all].sort((a, b) => {
    const scoreA =
      DEV_TRACK_SEEDS.find((s) => s.providerTrackId === a.providerTrackId)
        ?.popularScore ?? 0;
    const scoreB =
      DEV_TRACK_SEEDS.find((s) => s.providerTrackId === b.providerTrackId)
        ?.popularScore ?? 0;
    return scoreB - scoreA;
  });

  return {
    sourceMode: 'development-catalog' as const,
    featured: byPopularity.slice(0, 4),
    popular: byPopularity.slice(0, 8),
    trending: [...all].reverse().slice(0, 8),
    instrumental: all.filter((t) => t.isInstrumental).slice(0, 6),
    vocal: all.filter((t) => !t.isInstrumental).slice(0, 6),
    albums: DEV_ALBUMS,
    genres: GENRES,
  };
}

export async function searchMusic(
  params: {
    query?: string;
    genre?: string;
    vocalinstrumental?: 'vocal' | 'instrumental';
    limit?: number;
    offset?: number;
  },
  opts: ServiceOptions
) {
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 50);
  const offset = Math.max(params.offset ?? 0, 0);
  const q = (params.query ?? '').trim();
  const genre = (params.genre ?? '').trim();

  if (jamendoClient.isLiveConfigured) {
    try {
      const [tracksRes, artistsRes, albumsRes] = await Promise.allSettled([
        jamendoClient.request<{ results: JamendoRawTrack[] }>(
          '/tracks/',
          {
            search: q || undefined,
            tags: genre ? genre.toLowerCase() : undefined,
            vocalinstrumental: params.vocalinstrumental,
            limit,
            offset,
            include: 'licenses+musicinfo',
            audioformat: 'mp32',
          },
          opts.cacheTtlSeconds
        ),
        jamendoClient.request<{ results: JamendoRawArtist[] }>(
          '/artists/',
          {
            namesearch: q || undefined,
            limit: 8,
          },
          opts.cacheTtlSeconds
        ),
        jamendoClient.request<{ results: JamendoRawAlbum[] }>(
          '/albums/',
          {
            namesearch: q || undefined,
            limit: 8,
          },
          opts.cacheTtlSeconds
        ),
      ]);

      let rawTracks =
        tracksRes.status === 'fulfilled' ? tracksRes.value.data.results : [];
      const rawArtists =
        artistsRes.status === 'fulfilled' ? artistsRes.value.data.results : [];
      const rawAlbums =
        albumsRes.status === 'fulfilled' ? albumsRes.value.data.results : [];

      if (rawTracks.length === 0 && q && !genre) {
        try {
          const tagFallback = await jamendoClient.request<{
            results: JamendoRawTrack[];
          }>(
            '/tracks/',
            {
              tags: q.toLowerCase(),
              vocalinstrumental: params.vocalinstrumental,
              order: 'popularity_total',
              limit,
              offset,
              include: 'licenses+musicinfo',
              audioformat: 'mp32',
            },
            opts.cacheTtlSeconds
          );
          rawTracks = tagFallback.data.results;
        } catch {
          // Keep empty tracks if tag fallback also fails
        }
      }

      if (
        tracksRes.status === 'rejected' &&
        artistsRes.status === 'rejected' &&
        albumsRes.status === 'rejected'
      ) {
        throw tracksRes.reason;
      }

      await opts.logEvent?.(
        'jamendo_search',
        '/v3.0/tracks/',
        200,
        `Search query="${q}" genre="${genre}" count=${rawTracks.length}`
      );

      return {
        sourceMode: 'jamendo-live' as const,
        tracks: rawTracks.map((t) => normalizeLiveTrack(t, opts)),
        artists: rawArtists.map((a) => ({
          id: String(a.id),
          name: a.name,
          imageUrl: a.image || '/covers/cover_polar_ambient.jpg',
          website: a.website,
          joinDate: a.joindate,
          shareUrl: a.shareurl || `https://www.jamendo.com/artist/${a.id}`,
        })),
        albums: rawAlbums.map((a) => ({
          id: String(a.id),
          name: a.name,
          artistId: String(a.artist_id),
          artistName: a.artist_name,
          artworkUrl: a.image || '/covers/cover_nocturne_synth.jpg',
          releaseDate: a.releasedate || null,
          shareUrl: a.shareurl || `https://www.jamendo.com/album/${a.id}`,
        })),
        totalCount: rawTracks.length + offset,
        hasMore: rawTracks.length === limit,
      };
    } catch (err) {
      await opts.logEvent?.(
        'jamendo_error',
        '/v3.0/tracks/',
        502,
        err instanceof Error ? err.message : 'Search failed'
      );
    }
  }

  const all = DEV_TRACK_SEEDS.map((s) =>
    hydrateDevTrack(
      s,
      opts.globalDownloadsEnabled,
      opts.commercialModeRequested
    )
  );

  const qLower = q.toLowerCase();
  const genreLower = genre.toLowerCase();

  const filteredTracks = all.filter((t) => {
    if (
      params.vocalinstrumental === 'instrumental' &&
      !t.isInstrumental
    ) {
      return false;
    }
    if (params.vocalinstrumental === 'vocal' && t.isInstrumental) {
      return false;
    }
    if (
      genreLower &&
      t.genre.toLowerCase() !== genreLower &&
      !t.tags.some((tag) => tag.toLowerCase().includes(genreLower))
    ) {
      return false;
    }
    if (!qLower) return true;
    return (
      t.title.toLowerCase().includes(qLower) ||
      t.artistName.toLowerCase().includes(qLower) ||
      t.albumName.toLowerCase().includes(qLower) ||
      t.genre.toLowerCase().includes(qLower) ||
      t.tags.some((tag) => tag.toLowerCase().includes(qLower))
    );
  });

  const filteredArtists = DEV_ARTISTS.filter((a) => {
    if (genreLower && a.genre?.toLowerCase() !== genreLower) return false;
    if (!qLower) return true;
    return (
      a.name.toLowerCase().includes(qLower) ||
      (a.genre ?? '').toLowerCase().includes(qLower)
    );
  });

  const filteredAlbums = DEV_ALBUMS.filter((a) => {
    if (genreLower && a.genre?.toLowerCase() !== genreLower) return false;
    if (!qLower) return true;
    return (
      a.name.toLowerCase().includes(qLower) ||
      a.artistName.toLowerCase().includes(qLower) ||
      (a.genre ?? '').toLowerCase().includes(qLower)
    );
  });

  const sliced = filteredTracks.slice(offset, offset + limit);

  return {
    sourceMode: 'development-catalog' as const,
    tracks: sliced,
    artists: filteredArtists,
    albums: filteredAlbums,
    totalCount: filteredTracks.length,
    hasMore: offset + limit < filteredTracks.length,
  };
}

export async function getTrackById(id: string, opts: ServiceOptions) {
  if (jamendoClient.isLiveConfigured) {
    try {
      const res = await jamendoClient.request<{ results: JamendoRawTrack[] }>(
        '/tracks/',
        {
          id,
          include: 'licenses+musicinfo',
          audioformat: 'mp32',
        },
        opts.cacheTtlSeconds
      );
      if (res.data.results[0]) {
        const track = normalizeLiveTrack(res.data.results[0], opts);
        const simRes = await jamendoClient.request<{
          results: JamendoRawTrack[];
        }>(
          '/tracks/similar/',
          {
            id,
            limit: 4,
            include: 'licenses+musicinfo',
            audioformat: 'mp32',
          },
          opts.cacheTtlSeconds
        );
        return {
          track,
          similar: simRes.data.results.map((t) => normalizeLiveTrack(t, opts)),
        };
      }
    } catch {
      // Fall back to catalog check
    }
  }

  const seed = DEV_TRACK_SEEDS.find((s) => s.providerTrackId === id);
  if (!seed) return null;

  const track = hydrateDevTrack(
    seed,
    opts.globalDownloadsEnabled,
    opts.commercialModeRequested
  );
  const similar = DEV_TRACK_SEEDS.filter(
    (s) => s.providerTrackId !== id && s.genre === seed.genre
  )
    .slice(0, 4)
    .map((s) =>
      hydrateDevTrack(
        s,
        opts.globalDownloadsEnabled,
        opts.commercialModeRequested
      )
    );

  return { track, similar };
}

export async function getArtistDetails(id: string, opts: ServiceOptions) {
  if (jamendoClient.isLiveConfigured) {
    try {
      const [artistRes, tracksRes, albumsRes] = await Promise.all([
        jamendoClient.request<{ results: JamendoRawArtist[] }>(
          '/artists/',
          { id },
          opts.cacheTtlSeconds
        ),
        jamendoClient.request<{ results: JamendoRawTrack[] }>(
          '/tracks/',
          {
            artist_id: id,
            limit: 20,
            include: 'licenses+musicinfo',
            audioformat: 'mp32',
          },
          opts.cacheTtlSeconds
        ),
        jamendoClient.request<{ results: JamendoRawAlbum[] }>(
          '/albums/',
          { artist_id: id, limit: 12 },
          opts.cacheTtlSeconds
        ),
      ]);

      const raw = artistRes.data.results[0];
      if (raw) {
        return {
          artist: {
            id: String(raw.id),
            name: raw.name,
            imageUrl: raw.image || '/covers/cover_polar_ambient.jpg',
            website: raw.website,
            joinDate: raw.joindate,
            shareUrl: raw.shareurl || `https://www.jamendo.com/artist/${raw.id}`,
          } as NormalizedArtist,
          tracks: tracksRes.data.results.map((t) => normalizeLiveTrack(t, opts)),
          albums: albumsRes.data.results.map((a) => ({
            id: String(a.id),
            name: a.name,
            artistId: String(a.artist_id),
            artistName: a.artist_name,
            artworkUrl: a.image || '/covers/cover_nocturne_synth.jpg',
            releaseDate: a.releasedate || null,
            shareUrl: a.shareurl || `https://www.jamendo.com/album/${a.id}`,
          })) as NormalizedAlbum[],
        };
      }
    } catch {
      // Fallback below
    }
  }

  const artist = DEV_ARTISTS.find((a) => a.id === id);
  if (!artist) return null;

  const tracks = DEV_TRACK_SEEDS.filter((s) => s.artistId === id).map((s) =>
    hydrateDevTrack(
      s,
      opts.globalDownloadsEnabled,
      opts.commercialModeRequested
    )
  );
  const albums = DEV_ALBUMS.filter((a) => a.artistId === id);

  return { artist, tracks, albums };
}

export async function getAlbumDetails(id: string, opts: ServiceOptions) {
  if (jamendoClient.isLiveConfigured) {
    try {
      const [albumRes, tracksRes] = await Promise.all([
        jamendoClient.request<{ results: JamendoRawAlbum[] }>(
          '/albums/',
          { id },
          opts.cacheTtlSeconds
        ),
        jamendoClient.request<{ results: JamendoRawTrack[] }>(
          '/tracks/',
          {
            album_id: id,
            limit: 30,
            include: 'licenses+musicinfo',
            audioformat: 'mp32',
          },
          opts.cacheTtlSeconds
        ),
      ]);

      const raw = albumRes.data.results[0];
      if (raw) {
        return {
          album: {
            id: String(raw.id),
            name: raw.name,
            artistId: String(raw.artist_id),
            artistName: raw.artist_name,
            artworkUrl: raw.image || '/covers/cover_nocturne_synth.jpg',
            releaseDate: raw.releasedate || null,
            shareUrl: raw.shareurl || `https://www.jamendo.com/album/${raw.id}`,
          } as NormalizedAlbum,
          tracks: tracksRes.data.results.map((t) => normalizeLiveTrack(t, opts)),
        };
      }
    } catch {
      // Fallback below
    }
  }

  const album = DEV_ALBUMS.find((a) => a.id === id);
  if (!album) return null;

  const tracks = DEV_TRACK_SEEDS.filter((s) => s.albumId === id).map((s) =>
    hydrateDevTrack(
      s,
      opts.globalDownloadsEnabled,
      opts.commercialModeRequested
    )
  );
  return { album, tracks };
}

export function getGenresList() {
  return GENRES;
}
