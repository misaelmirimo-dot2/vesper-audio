import 'dotenv/config';
import http from 'node:http';
import { Readable } from 'node:stream';
import type { ReadableStream as NodeWebReadableStream } from 'node:stream/web';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { jamendoClient } from './server/jamendo/client.ts';
import { generateTrackWavBuffer } from './server/jamendo/audioSynth.ts';
import { normalizeDownloadContentType } from './src/utils/localMedia.ts';
import {
  getAlbumDetails,
  getArtistDetails,
  getDiscoverData,
  getGenresList,
  getTrackById,
  searchMusic,
} from './server/jamendo/services.ts';
import { searchYouTube } from './server/youtube/services.ts';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser, updateUserProfile } from './src/db/users.ts';
import {
  addTrackToPlaylistRecord,
  addYouTubePlaylistItemRecord,
  createPlaylistRecord,
  createYouTubePlaylistRecord,
  deleteDownloadRecord,
  deletePlaylistRecord,
  deleteYouTubePlaylistRecord,
  getAdminOverview,
  getGlobalSettings,
  getUserLibrary,
  getUserPlaylists,
  getUserYouTubeLibrary,
  recordApiLog,
  recordListeningHistoryItem,
  removeTrackFromPlaylistRecord,
  removeYouTubePlaylistItemRecord,
  reorderPlaylistTracksRecord,
  toggleFavoriteTrack,
  toggleSavedCollection,
  toggleYouTubeFavoriteRecord,
  updateGlobalSettings,
  updatePlaylistRecord,
  upsertDownloadRecord,
} from './src/db/repository.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const audioCache = new Map<string, Buffer>();

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  // Basic security & CORS headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Health endpoint
  app.get('/api/health', async (_req, res) => {
    try {
      const settings = await getGlobalSettings();
      res.json({
        status: 'ok',
        dbConnected: true,
        jamendoLiveConfigured: jamendoClient.isLiveConfigured,
        downloadsEnabledGlobally: settings.downloadsEnabledGlobally,
        timestamp: new Date().toISOString(),
      });
    } catch {
      res.json({
        status: 'ok',
        dbConnected: false,
        jamendoLiveConfigured: jamendoClient.isLiveConfigured,
        downloadsEnabledGlobally: true,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // OpenAPI 3.0 Documentation
  app.get('/api/docs', (_req, res) => {
    res.json({
      openapi: '3.0.3',
      info: {
        title: 'Vesper Audio — Jamendo-Powered Music PWA API',
        version: '1.0.0',
        description:
          'REST API mediating Jamendo v3.0 discovery, Creative Commons licence validation, user library, playlists, and authorized offline downloads.',
      },
      paths: {
        '/api/music/discover': { get: { summary: 'Discover curated & popular tracks' } },
        '/api/music/search': { get: { summary: 'Rate-limited search across tracks, artists, albums' } },
        '/api/music/tracks/{id}': { get: { summary: 'Track detail, licence evaluation & similar tracks' } },
        '/api/music/artists/{id}': { get: { summary: 'Artist detail, tracks and albums' } },
        '/api/music/albums/{id}': { get: { summary: 'Album detail and tracklist' } },
        '/api/youtube/search': { get: { summary: 'Search YouTube music and videos for in-app embed playback' } },
        '/api/library': { get: { summary: 'Authenticated user library snapshot' } },
        '/api/library/favorites': { post: { summary: 'Add/remove favorite track' } },
        '/api/playlists': { get: { summary: 'List user playlists' }, post: { summary: 'Create playlist' } },
        '/api/history': { post: { summary: 'Record listening history item' } },
        '/api/downloads/authorize': { post: { summary: 'Server-authoritative download licence verification' } },
        '/api/admin/overview': { get: { summary: 'Admin telemetry, logs, and feature flags' } },
      },
    });
  });

  // Deterministic audio stream endpoint for development preview mode (supports HTTP Range for seeking)
  app.get('/api/demo-audio/:id', (req, res) => {
    const trackId = req.params.id;
    let wav = audioCache.get(trackId);
    if (!wav) {
      wav = generateTrackWavBuffer(trackId, 24);
      if (audioCache.size > 32) {
        const firstKey = audioCache.keys().next().value;
        if (firstKey) audioCache.delete(firstKey);
      }
      audioCache.set(trackId, wav);
    }

    const total = wav.length;
    const isDownload = req.query.download === '1';

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    if (isDownload) {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="vesper-track-${trackId}.wav"`
      );
    }

    const range = req.headers.range;
    if (range) {
      const match = /bytes=(\d+)-(\d*)/.exec(range);
      if (match) {
        const start = Number(match[1]);
        const end = match[2] ? Math.min(Number(match[2]), total - 1) : total - 1;
        if (start >= total || start > end) {
          res.status(416).setHeader('Content-Range', `bytes */${total}`).end();
          return;
        }
        const chunk = wav.subarray(start, end + 1);
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
        res.setHeader('Content-Length', String(chunk.length));
        res.end(chunk);
        return;
      }
    }

    res.setHeader('Content-Length', String(total));
    res.end(wav);
  });

  // Helper to resolve current policy options
  const buildServiceOptions = async (commercialQuery?: unknown) => {
    const settings = await getGlobalSettings();
    const commercialRequested =
      settings.commercialModeEnforced || commercialQuery === 'true';

    return {
      globalDownloadsEnabled: settings.downloadsEnabledGlobally,
      commercialModeRequested: commercialRequested,
      cacheTtlSeconds: settings.apiCacheTtlSeconds,
      logEvent: recordApiLog,
    };
  };

  // Music discovery & search routes
  app.get('/api/music/discover', async (req, res) => {
    try {
      const opts = await buildServiceOptions(req.query.commercialMode);
      const data = await getDiscoverData(opts);
      res.json(data);
    } catch (error) {
      console.error('Discover endpoint error:', error);
      res.status(502).json({ error: 'Unable to load music discovery feed.' });
    }
  });

  app.get('/api/music/genres', (_req, res) => {
    res.json({ genres: getGenresList() });
  });

  app.get('/api/music/search', async (req, res) => {
    const clientIp = req.ip || 'anonymous';
    if (!jamendoClient.checkRateLimit(clientIp, 60, 60_000)) {
      await recordApiLog(
        'rate_limit',
        '/api/music/search',
        429,
        `Rate limit exceeded for ${clientIp}`
      );
      return res.status(429).json({
        error: 'Search rate limit reached. Please wait a few seconds and retry.',
      });
    }

    try {
      const opts = await buildServiceOptions(req.query.commercialMode);
      const result = await searchMusic(
        {
          query: typeof req.query.q === 'string' ? req.query.q : '',
          genre: typeof req.query.genre === 'string' ? req.query.genre : '',
          vocalinstrumental:
            req.query.vocalinstrumental === 'instrumental' ||
            req.query.vocalinstrumental === 'vocal'
              ? req.query.vocalinstrumental
              : undefined,
          limit: req.query.limit ? Number(req.query.limit) : 20,
          offset: req.query.offset ? Number(req.query.offset) : 0,
        },
        opts
      );
      res.json(result);
    } catch (error) {
      console.error('Search endpoint error:', error);
      res.status(502).json({ error: 'Music search failed. Please retry.' });
    }
  });

  app.get('/api/music/tracks', async (req, res) => {
    try {
      const opts = await buildServiceOptions(req.query.commercialMode);
      const result = await searchMusic(
        {
          query: typeof req.query.q === 'string' ? req.query.q : '',
          genre: typeof req.query.genre === 'string' ? req.query.genre : '',
          limit: req.query.limit ? Number(req.query.limit) : 20,
          offset: req.query.offset ? Number(req.query.offset) : 0,
        },
        opts
      );
      res.json({ tracks: result.tracks, totalCount: result.totalCount, hasMore: result.hasMore });
    } catch (error) {
      res.status(502).json({ error: 'Failed to retrieve tracks.' });
    }
  });

  app.get('/api/music/tracks/:id', async (req, res) => {
    try {
      const opts = await buildServiceOptions(req.query.commercialMode);
      const detail = await getTrackById(req.params.id, opts);
      if (!detail) {
        return res.status(404).json({ error: 'Track not found.' });
      }
      res.json(detail);
    } catch (error) {
      res.status(502).json({ error: 'Failed to retrieve track details.' });
    }
  });

  app.get('/api/music/artists', async (req, res) => {
    try {
      const opts = await buildServiceOptions(req.query.commercialMode);
      const result = await searchMusic(
        { query: typeof req.query.q === 'string' ? req.query.q : '' },
        opts
      );
      res.json({ artists: result.artists });
    } catch {
      res.status(502).json({ error: 'Failed to retrieve artists.' });
    }
  });

  app.get('/api/music/artists/:id', async (req, res) => {
    try {
      const opts = await buildServiceOptions(req.query.commercialMode);
      const detail = await getArtistDetails(req.params.id, opts);
      if (!detail) {
        return res.status(404).json({ error: 'Artist not found.' });
      }
      res.json(detail);
    } catch {
      res.status(502).json({ error: 'Failed to retrieve artist details.' });
    }
  });

  app.get('/api/music/albums', async (req, res) => {
    try {
      const opts = await buildServiceOptions(req.query.commercialMode);
      const result = await searchMusic(
        { query: typeof req.query.q === 'string' ? req.query.q : '' },
        opts
      );
      res.json({ albums: result.albums });
    } catch {
      res.status(502).json({ error: 'Failed to retrieve albums.' });
    }
  });

  app.get('/api/music/albums/:id', async (req, res) => {
    try {
      const opts = await buildServiceOptions(req.query.commercialMode);
      const detail = await getAlbumDetails(req.params.id, opts);
      if (!detail) {
        return res.status(404).json({ error: 'Album not found.' });
      }
      res.json(detail);
    } catch {
      res.status(502).json({ error: 'Failed to retrieve album details.' });
    }
  });

  // YouTube music & video discovery (embed-only, no unauthorized downloading)
  app.get('/api/youtube/search', async (req, res) => {
    const clientIp = req.ip || 'anonymous';
    if (!jamendoClient.checkRateLimit(`yt:${clientIp}`, 45, 60_000)) {
      await recordApiLog(
        'rate_limit',
        '/api/youtube/search',
        429,
        `YouTube search rate limit exceeded for ${clientIp}`
      );
      return res.status(429).json({
        error: 'YouTube search rate limit reached. Please wait a few seconds and retry.',
      });
    }

    try {
      const query = typeof req.query.q === 'string' ? req.query.q : '';
      const rawFilter = req.query.filter;
      const filter =
        rawFilter === 'music' || rawFilter === 'live' ? rawFilter : 'all';
      const limit = req.query.limit ? Number(req.query.limit) : 12;

      const payload = await searchYouTube({ query, filter, limit });
      await recordApiLog(
        'youtube_search',
        '/api/youtube/search',
        200,
        `q="${query}" filter=${filter} mode=${payload.sourceMode} count=${payload.results.length}`
      );
      res.json(payload);
    } catch (error) {
      console.error('YouTube search endpoint error:', error);
      res.status(502).json({ error: 'YouTube search failed. Please retry.' });
    }
  });

  // Authenticated YouTube Saved Favorites & Playlists (metadata & embed links only)
  app.get('/api/youtube/library', requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = await getOrCreateUser(
        req.user!.uid,
        req.user!.email || `${req.user!.uid}@users.vesper.local`,
        req.user!.name,
        req.user!.picture
      );
      const data = await getUserYouTubeLibrary(dbUser.id);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load YouTube library' });
    }
  });

  app.post('/api/youtube/favorites', requireAuth, async (req: AuthRequest, res) => {
    try {
      const video = req.body?.video;
      if (!video?.videoId || !video?.title) {
        return res.status(400).json({ error: 'Valid YouTube video payload is required.' });
      }
      const dbUser = await getOrCreateUser(
        req.user!.uid,
        req.user!.email || `${req.user!.uid}@users.vesper.local`,
        req.user!.name,
        req.user!.picture
      );
      await toggleYouTubeFavoriteRecord(dbUser.id, video, 'add');
      res.status(201).json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to save YouTube favorite' });
    }
  });

  app.delete('/api/youtube/favorites/:videoId', requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = await getOrCreateUser(
        req.user!.uid,
        req.user!.email || `${req.user!.uid}@users.vesper.local`,
        req.user!.name,
        req.user!.picture
      );
      await toggleYouTubeFavoriteRecord(
        dbUser.id,
        {
          videoId: req.params.videoId,
          title: '',
          channelTitle: '',
          description: '',
          thumbnailUrl: '',
          publishedAt: '',
          durationLabel: '',
          viewCountLabel: '',
          category: 'music',
          embedUrl: '',
          watchUrl: '',
        },
        'remove'
      );
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to remove YouTube favorite' });
    }
  });

  app.post('/api/youtube/playlists', requireAuth, async (req: AuthRequest, res) => {
    try {
      const name = String(req.body?.name || '').trim();
      if (!name) {
        return res.status(400).json({ error: 'Playlist name is required.' });
      }
      const dbUser = await getOrCreateUser(
        req.user!.uid,
        req.user!.email || `${req.user!.uid}@users.vesper.local`,
        req.user!.name,
        req.user!.picture
      );
      const playlist = await createYouTubePlaylistRecord(
        dbUser.id,
        name,
        typeof req.body?.description === 'string' ? req.body.description : ''
      );
      res.status(201).json({ playlist });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to create YouTube playlist' });
    }
  });

  app.delete('/api/youtube/playlists/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = await getOrCreateUser(
        req.user!.uid,
        req.user!.email || `${req.user!.uid}@users.vesper.local`,
        req.user!.name,
        req.user!.picture
      );
      const deleted = await deleteYouTubePlaylistRecord(
        dbUser.id,
        Number(req.params.id)
      );
      if (!deleted) {
        return res.status(404).json({ error: 'YouTube playlist not found.' });
      }
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to delete YouTube playlist' });
    }
  });

  app.post('/api/youtube/playlists/:id/items', requireAuth, async (req: AuthRequest, res) => {
    try {
      const video = req.body?.video;
      if (!video?.videoId || !video?.title) {
        return res.status(400).json({ error: 'Valid YouTube video payload is required.' });
      }
      const dbUser = await getOrCreateUser(
        req.user!.uid,
        req.user!.email || `${req.user!.uid}@users.vesper.local`,
        req.user!.name,
        req.user!.picture
      );
      const ok = await addYouTubePlaylistItemRecord(
        dbUser.id,
        Number(req.params.id),
        video
      );
      if (!ok) {
        return res.status(404).json({ error: 'YouTube playlist not found.' });
      }
      res.status(201).json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to add video to YouTube playlist' });
    }
  });

  app.delete(
    '/api/youtube/playlists/:id/items/:videoId',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const dbUser = await getOrCreateUser(
          req.user!.uid,
          req.user!.email || `${req.user!.uid}@users.vesper.local`,
          req.user!.name,
          req.user!.picture
        );
        const ok = await removeYouTubePlaylistItemRecord(
          dbUser.id,
          Number(req.params.id),
          req.params.videoId
        );
        if (!ok) {
          return res.status(404).json({ error: 'YouTube playlist not found.' });
        }
        res.json({ ok: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to remove video from YouTube playlist' });
      }
    }
  );

  // Authenticated User Profile
  app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@users.vesper.local`;
      const user = await getOrCreateUser(
        uid,
        email,
        req.user!.name,
        req.user!.picture
      );
      res.json({ user });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load profile' });
    }
  });

  app.patch('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@users.vesper.local`;
      await getOrCreateUser(uid, email, req.user!.name, req.user!.picture);
      const updated = await updateUserProfile(uid, {
        username:
          typeof req.body.username === 'string'
            ? req.body.username.trim().slice(0, 60)
            : undefined,
        bio:
          typeof req.body.bio === 'string'
            ? req.body.bio.trim().slice(0, 300)
            : undefined,
        profileImage:
          typeof req.body.profileImage === 'string'
            ? req.body.profileImage
            : undefined,
        commercialUseMode:
          typeof req.body.commercialUseMode === 'boolean'
            ? req.body.commercialUseMode
            : undefined,
      });
      res.json({ user: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to update profile' });
    }
  });

  // Authenticated Personal Library
  app.get('/api/library', requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = await getOrCreateUser(
        req.user!.uid,
        req.user!.email || `${req.user!.uid}@users.vesper.local`,
        req.user!.name,
        req.user!.picture
      );
      const settings = await getGlobalSettings();
      const library = await getUserLibrary(
        dbUser.id,
        settings.downloadsEnabledGlobally,
        settings.commercialModeEnforced || dbUser.commercialUseMode
      );
      res.json(library);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load library' });
    }
  });

  app.post('/api/library/favorites', requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = await getOrCreateUser(
        req.user!.uid,
        req.user!.email || `${req.user!.uid}@users.vesper.local`,
        req.user!.name,
        req.user!.picture
      );
      const trackId = String(req.body.trackId || '');
      const opts = await buildServiceOptions(dbUser.commercialUseMode);
      const detail = await getTrackById(trackId, opts);
      if (!detail) {
        return res.status(404).json({ error: 'Track not found.' });
      }
      await toggleFavoriteTrack(dbUser.id, detail.track, 'add');
      res.status(201).json({ ok: true, track: detail.track });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to add favorite' });
    }
  });

  app.delete(
    '/api/library/favorites/:id',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const dbUser = await getOrCreateUser(
          req.user!.uid,
          req.user!.email || `${req.user!.uid}@users.vesper.local`,
          req.user!.name,
          req.user!.picture
        );
        const opts = await buildServiceOptions(dbUser.commercialUseMode);
        const detail = await getTrackById(req.params.id, opts);
        if (!detail) {
          return res.status(404).json({ error: 'Track not found.' });
        }
        await toggleFavoriteTrack(dbUser.id, detail.track, 'remove');
        res.json({ ok: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to remove favorite' });
      }
    }
  );

  app.post(
    '/api/library/collections',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const dbUser = await getOrCreateUser(
          req.user!.uid,
          req.user!.email || `${req.user!.uid}@users.vesper.local`,
          req.user!.name,
          req.user!.picture
        );
        const action = req.body.action === 'remove' ? 'remove' : 'add';
        await toggleSavedCollection(
          dbUser.id,
          {
            collectionType:
              req.body.collectionType === 'artist' ? 'artist' : 'album',
            providerId: String(req.body.providerId || ''),
            name: String(req.body.name || ''),
            subtitle:
              typeof req.body.subtitle === 'string' ? req.body.subtitle : '',
            artworkUrl:
              typeof req.body.artworkUrl === 'string'
                ? req.body.artworkUrl
                : '',
          },
          action
        );
        res.json({ ok: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to update collection' });
      }
    }
  );

  // Authenticated Playlists
  app.get('/api/playlists', requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = await getOrCreateUser(
        req.user!.uid,
        req.user!.email || `${req.user!.uid}@users.vesper.local`,
        req.user!.name,
        req.user!.picture
      );
      const settings = await getGlobalSettings();
      const items = await getUserPlaylists(
        dbUser.id,
        settings.downloadsEnabledGlobally,
        settings.commercialModeEnforced || dbUser.commercialUseMode
      );
      res.json({ playlists: items });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load playlists' });
    }
  });

  app.post('/api/playlists', requireAuth, async (req: AuthRequest, res) => {
    try {
      const name = String(req.body.name || '').trim();
      if (!name) {
        return res.status(400).json({ error: 'Playlist name is required.' });
      }
      const dbUser = await getOrCreateUser(
        req.user!.uid,
        req.user!.email || `${req.user!.uid}@users.vesper.local`,
        req.user!.name,
        req.user!.picture
      );
      const playlist = await createPlaylistRecord(
        dbUser.id,
        name,
        typeof req.body.description === 'string' ? req.body.description : ''
      );
      res.status(201).json({ playlist });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to create playlist' });
    }
  });

  app.patch('/api/playlists/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = await getOrCreateUser(
        req.user!.uid,
        req.user!.email || `${req.user!.uid}@users.vesper.local`,
        req.user!.name,
        req.user!.picture
      );
      const updated = await updatePlaylistRecord(dbUser.id, Number(req.params.id), {
        name: typeof req.body.name === 'string' ? req.body.name.trim() : undefined,
        description:
          typeof req.body.description === 'string'
            ? req.body.description.trim()
            : undefined,
      });
      if (!updated) {
        return res.status(404).json({ error: 'Playlist not found.' });
      }
      res.json({ playlist: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to update playlist' });
    }
  });

  app.delete('/api/playlists/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = await getOrCreateUser(
        req.user!.uid,
        req.user!.email || `${req.user!.uid}@users.vesper.local`,
        req.user!.name,
        req.user!.picture
      );
      const deleted = await deletePlaylistRecord(dbUser.id, Number(req.params.id));
      if (!deleted) {
        return res.status(404).json({ error: 'Playlist not found.' });
      }
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to delete playlist' });
    }
  });

  app.post(
    '/api/playlists/:id/tracks',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const dbUser = await getOrCreateUser(
          req.user!.uid,
          req.user!.email || `${req.user!.uid}@users.vesper.local`,
          req.user!.name,
          req.user!.picture
        );
        const opts = await buildServiceOptions(dbUser.commercialUseMode);
        const detail = await getTrackById(String(req.body.trackId || ''), opts);
        if (!detail) {
          return res.status(404).json({ error: 'Track not found.' });
        }
        const ok = await addTrackToPlaylistRecord(
          dbUser.id,
          Number(req.params.id),
          detail.track
        );
        if (!ok) {
          return res.status(404).json({ error: 'Playlist not found.' });
        }
        res.status(201).json({ ok: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to add track' });
      }
    }
  );

  app.patch(
    '/api/playlists/:id/tracks',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const dbUser = await getOrCreateUser(
          req.user!.uid,
          req.user!.email || `${req.user!.uid}@users.vesper.local`,
          req.user!.name,
          req.user!.picture
        );
        const orderedTrackIds = Array.isArray(req.body.orderedTrackIds)
          ? req.body.orderedTrackIds.map(String)
          : [];
        const ok = await reorderPlaylistTracksRecord(
          dbUser.id,
          Number(req.params.id),
          orderedTrackIds
        );
        if (!ok) {
          return res.status(404).json({ error: 'Playlist not found.' });
        }
        res.json({ ok: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to reorder tracks' });
      }
    }
  );

  app.delete(
    '/api/playlists/:id/tracks/:trackId',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const dbUser = await getOrCreateUser(
          req.user!.uid,
          req.user!.email || `${req.user!.uid}@users.vesper.local`,
          req.user!.name,
          req.user!.picture
        );
        const ok = await removeTrackFromPlaylistRecord(
          dbUser.id,
          Number(req.params.id),
          req.params.trackId
        );
        if (!ok) {
          return res.status(404).json({ error: 'Track or playlist not found.' });
        }
        res.json({ ok: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to remove track' });
      }
    }
  );

  // Listening history
  app.post('/api/history', requireAuth, async (req: AuthRequest, res) => {
    try {
      const dbUser = await getOrCreateUser(
        req.user!.uid,
        req.user!.email || `${req.user!.uid}@users.vesper.local`,
        req.user!.name,
        req.user!.picture
      );
      const opts = await buildServiceOptions(dbUser.commercialUseMode);
      const detail = await getTrackById(String(req.body.trackId || ''), opts);
      if (!detail) {
        return res.status(404).json({ error: 'Track not found.' });
      }
      await recordListeningHistoryItem(
        dbUser.id,
        detail.track,
        Number(req.body.playbackPosition || 0)
      );
      res.status(201).json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to record history' });
    }
  });

  // Server-authoritative download license authorization & record persistence
  app.post('/api/downloads/authorize', async (req: AuthRequest, res) => {
    try {
      const trackId = String(req.body.trackId || '');
      if (!trackId) {
        return res.status(400).json({ error: 'trackId is required.' });
      }
      const commercialRequested = Boolean(req.body.commercialMode);
      const opts = await buildServiceOptions(
        commercialRequested ? 'true' : 'false'
      );
      const detail = await getTrackById(trackId, opts);
      if (!detail) {
        return res.status(404).json({ error: 'Track not found.' });
      }

      const evaluation = detail.track.licenseEvaluation;
      await recordApiLog(
        'download_license_check',
        '/api/downloads/authorize',
        evaluation.offlineDownloadPermitted ? 200 : 403,
        `Track ${trackId} (${evaluation.licenseType}) permitted=${evaluation.offlineDownloadPermitted}`
      );

      if (!evaluation.offlineDownloadPermitted || !detail.track.downloadUrl) {
        return res.status(403).json({
          authorized: false,
          reason:
            evaluation.blockedReason ||
            'Download is not permitted under the track licence.',
          licenseEvaluation: evaluation,
        });
      }

      res.json({
        authorized: true,
        downloadUrl: detail.track.downloadUrl,
        licenseEvaluation: evaluation,
        track: detail.track,
      });
    } catch (error: any) {
      res
        .status(500)
        .json({ error: error.message || 'Download authorization check failed.' });
    }
  });

  // Pass-through stream for license-verified Jamendo tracks (avoids browser CORS blocks without server-side rehosting)
  app.get('/api/downloads/stream/:trackId', async (req, res) => {
    try {
      const trackId = String(req.params.trackId || '');
      const commercialRequested = req.query.commercialMode === 'true';
      const opts = await buildServiceOptions(
        commercialRequested ? 'true' : 'false'
      );
      const detail = await getTrackById(trackId, opts);

      if (
        !detail ||
        !detail.track.licenseEvaluation.offlineDownloadPermitted ||
        !detail.track.downloadUrl
      ) {
        return res.status(403).json({
          error:
            detail?.track.licenseEvaluation.blockedReason ||
            'Download is not permitted under the track licence.',
        });
      }

      const controller = new AbortController();
      req.on('close', () => controller.abort());

      const upstream = await fetch(detail.track.downloadUrl, {
        redirect: 'follow',
        signal: controller.signal,
      });

      if (!upstream.ok || !upstream.body) {
        return res
          .status(502)
          .json({ error: `Upstream download failed (${upstream.status})` });
      }

      const normalizedMime = normalizeDownloadContentType(
        upstream.headers.get('content-type'),
        detail.track.audioFormat
      );

      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Type', normalizedMime);
      const len = upstream.headers.get('content-length');
      if (len) {
        res.setHeader('Content-Length', len);
      }

      await recordApiLog(
        'download_stream',
        '/api/downloads/stream',
        200,
        `Streamed authorized CC download for track ${trackId}`
      );

      const nodeStream = Readable.fromWeb(
        upstream.body as unknown as NodeWebReadableStream
      );
      nodeStream.on('error', () => {
        if (!res.headersSent) {
          res.status(502).end();
        } else {
          res.end();
        }
      });
      nodeStream.pipe(res);
    } catch (error: any) {
      if (!res.headersSent) {
        res
          .status(502)
          .json({ error: error?.message || 'Unable to stream authorized download.' });
      }
    }
  });

  app.post(
    '/api/downloads/record',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const dbUser = await getOrCreateUser(
          req.user!.uid,
          req.user!.email || `${req.user!.uid}@users.vesper.local`,
          req.user!.name,
          req.user!.picture
        );
        const opts = await buildServiceOptions(dbUser.commercialUseMode);
        const detail = await getTrackById(String(req.body.trackId || ''), opts);
        if (!detail || !detail.track.licenseEvaluation.offlineDownloadPermitted) {
          return res.status(403).json({ error: 'Download not authorized.' });
        }
        const record = await upsertDownloadRecord(
          dbUser.id,
          detail.track,
          String(req.body.status || 'completed'),
          Number(req.body.fileSizeBytes || 0)
        );
        res.status(201).json({ record });
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to record download' });
      }
    }
  );

  app.delete(
    '/api/downloads/:trackId',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const dbUser = await getOrCreateUser(
          req.user!.uid,
          req.user!.email || `${req.user!.uid}@users.vesper.local`,
          req.user!.name,
          req.user!.picture
        );
        await deleteDownloadRecord(dbUser.id, req.params.trackId);
        res.json({ ok: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to delete download' });
      }
    }
  );

  // Admin Overview & Global Policy Configuration
  app.get('/api/admin/overview', async (req, res) => {
    try {
      const overview = await getAdminOverview();
      const hasAuth = Boolean(req.headers.authorization?.startsWith('Bearer '));
      res.json({
        ...overview,
        // Never expose user email addresses to unauthenticated requests
        users: hasAuth
          ? overview.users
          : overview.users.map((u) => ({
              id: u.id,
              username: u.username,
              commercialUseMode: u.commercialUseMode,
              createdAt: u.createdAt,
            })),
        jamendoCache: jamendoClient.getCacheStats(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to load admin data' });
    }
  });

  app.patch('/api/admin/settings', async (req, res) => {
    try {
      const updates: {
        downloadsEnabledGlobally?: boolean;
        apiCacheTtlSeconds?: number;
        commercialModeEnforced?: boolean;
        featureFlags?: Record<string, boolean>;
      } = {};

      if (typeof req.body.downloadsEnabledGlobally === 'boolean') {
        updates.downloadsEnabledGlobally = req.body.downloadsEnabledGlobally;
      }
      if (typeof req.body.apiCacheTtlSeconds === 'number') {
        updates.apiCacheTtlSeconds = Math.max(
          15,
          Math.min(3600, req.body.apiCacheTtlSeconds)
        );
      }
      if (typeof req.body.commercialModeEnforced === 'boolean') {
        updates.commercialModeEnforced = req.body.commercialModeEnforced;
      }
      if (
        req.body.featureFlags &&
        typeof req.body.featureFlags === 'object'
      ) {
        updates.featureFlags = req.body.featureFlags;
      }

      const settings = await updateGlobalSettings(updates);
      await recordApiLog(
        'admin_settings_update',
        '/api/admin/settings',
        200,
        `Updated policy: downloads=${settings.downloadsEnabledGlobally}, ttl=${settings.apiCacheTtlSeconds}s`
      );

      if (req.body.clearCache === true) {
        jamendoClient.clearCache();
      }

      res.json({ settings });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to update settings' });
    }
  });

  const httpServer = http.createServer(app);

  // Frontend serving (Vite dev middleware in development, static dist in production)
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Vesper Audio server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
