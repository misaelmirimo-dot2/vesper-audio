export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  durationLabel: string;
  viewCountLabel: string;
  category: 'music' | 'live' | 'video';
  embedUrl: string;
  watchUrl: string;
}

export interface YouTubeSearchResponse {
  query: string;
  filter: 'all' | 'music' | 'live';
  sourceMode: 'youtube-api' | 'youtube-public' | 'curated-fallback';
  results: YouTubeSearchResult[];
}

const CURATED_YOUTUBE_CATALOG: YouTubeSearchResult[] = [
  {
    videoId: 'jfKfPfyJRdk',
    title: 'lofi hip hop radio — beats to relax/study to',
    channelTitle: 'Lofi Girl',
    description: '24/7 chill instrumental beats stream for deep focus and late-night coding.',
    thumbnailUrl: '/covers/cover_kinetic_beats.jpg',
    publishedAt: 'Live Stream',
    durationLabel: 'LIVE',
    viewCountLabel: 'Live Radio',
    category: 'live',
    embedUrl: 'https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?autoplay=1&rel=0',
    watchUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
  },
  {
    videoId: '4xDzrJKXOOY',
    title: 'synthwave radio — chill synth / retro beats',
    channelTitle: 'Lofi Girl Synthwave',
    description: 'Analog synth arpeggios and nocturnal electronic soundscapes.',
    thumbnailUrl: '/covers/cover_nocturne_synth.jpg',
    publishedAt: 'Live Stream',
    durationLabel: 'LIVE',
    viewCountLabel: 'Live Radio',
    category: 'live',
    embedUrl: 'https://www.youtube-nocookie.com/embed/4xDzrJKXOOY?autoplay=1&rel=0',
    watchUrl: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
  },
  {
    videoId: '5qap5aO4i9A',
    title: 'Ambient Modular & Tape Loops — Studio Session',
    channelTitle: 'Vesper Sessions',
    description: 'Live analog modular synthesizer performance recorded direct to two-track tape.',
    thumbnailUrl: '/covers/hero_indie_studio.jpg',
    publishedAt: '2025-10-12',
    durationLabel: '42:18',
    viewCountLabel: '1.2M views',
    category: 'music',
    embedUrl: 'https://www.youtube-nocookie.com/embed/5qap5aO4i9A?autoplay=1&rel=0',
    watchUrl: 'https://www.youtube.com/watch?v=5qap5aO4i9A',
  },
  {
    videoId: 'DWcJFNfaw9c',
    title: 'Midnight Piano & Cello — Minimalist Chamber Works',
    channelTitle: 'Nordic Felt Audio',
    description: 'Intimate neo-classical felt piano and cello improvisations.',
    thumbnailUrl: '/covers/cover_polar_ambient.jpg',
    publishedAt: '2025-08-19',
    durationLabel: '34:05',
    viewCountLabel: '840K views',
    category: 'music',
    embedUrl: 'https://www.youtube-nocookie.com/embed/DWcJFNfaw9c?autoplay=1&rel=0',
    watchUrl: 'https://www.youtube.com/watch?v=DWcJFNfaw9c',
  },
  {
    videoId: 'n61ULEU7CO0',
    title: 'Acoustic Fingerstyle Guitar — Tiny Room Session',
    channelTitle: 'Timber Acoustic',
    description: 'Unplugged indie folk acoustic performance with ribbon microphones.',
    thumbnailUrl: '/covers/cover_amber_folk.jpg',
    publishedAt: '2025-07-04',
    durationLabel: '18:44',
    viewCountLabel: '410K views',
    category: 'music',
    embedUrl: 'https://www.youtube-nocookie.com/embed/n61ULEU7CO0?autoplay=1&rel=0',
    watchUrl: 'https://www.youtube.com/watch?v=n61ULEU7CO0',
  },
  {
    videoId: 'kgx4WGK0oNU',
    title: 'Late Night Jazz Quartet — Upright Bass & Saxophone',
    channelTitle: 'Blue Hour Records',
    description: 'Smooth modal jazz quartet session filmed in monochrome.',
    thumbnailUrl: '/covers/cover_amber_folk.jpg',
    publishedAt: '2025-09-28',
    durationLabel: '51:12',
    viewCountLabel: '620K views',
    category: 'music',
    embedUrl: 'https://www.youtube-nocookie.com/embed/kgx4WGK0oNU?autoplay=1&rel=0',
    watchUrl: 'https://www.youtube.com/watch?v=kgx4WGK0oNU',
  },
  {
    videoId: '7NOSDKb0HlU',
    title: 'Deep Focus Electronic — Chillstep & Downtempo Mix',
    channelTitle: 'Obsidian Sound',
    description: 'Curated downtempo electronic tracks for work and study.',
    thumbnailUrl: '/covers/cover_nocturne_synth.jpg',
    publishedAt: '2025-11-02',
    durationLabel: '1:04:30',
    viewCountLabel: '950K views',
    category: 'music',
    embedUrl: 'https://www.youtube-nocookie.com/embed/7NOSDKb0HlU?autoplay=1&rel=0',
    watchUrl: 'https://www.youtube.com/watch?v=7NOSDKb0HlU',
  },
  {
    videoId: 'rUxyKA_-grg',
    title: 'chill beats to sleep/chill to — 24/7 radio',
    channelTitle: 'Lofi Girl Sleep',
    description: 'Slow-tempo atmospheric ambient beats and rain textures.',
    thumbnailUrl: '/covers/cover_polar_ambient.jpg',
    publishedAt: 'Live Stream',
    durationLabel: 'LIVE',
    viewCountLabel: 'Live Radio',
    category: 'live',
    embedUrl: 'https://www.youtube-nocookie.com/embed/rUxyKA_-grg?autoplay=1&rel=0',
    watchUrl: 'https://www.youtube.com/watch?v=rUxyKA_-grg',
  },
];

const searchCache = new Map<
  string,
  { expiresAt: number; payload: YouTubeSearchResponse }
>();

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function parseIso8601Duration(iso?: string): string {
  if (!iso) return '';
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso);
  if (!match) return '';
  const h = Number(match[1] || 0);
  const m = Number(match[2] || 0);
  const s = Number(match[3] || 0);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function extractTextRuns(obj: unknown): string {
  if (!obj || typeof obj !== 'object') return '';
  const record = obj as { simpleText?: string; runs?: Array<{ text?: string }> };
  if (typeof record.simpleText === 'string') return record.simpleText;
  if (Array.isArray(record.runs)) {
    return record.runs.map((r) => r.text ?? '').join('');
  }
  return '';
}

export function extractVideoRenderersFromInitialData(
  data: unknown,
  limit = 16
): YouTubeSearchResult[] {
  const results: YouTubeSearchResult[] = [];
  const seen = new Set<string>();

  function walk(node: unknown) {
    if (results.length >= limit || !node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const item of node) {
        if (results.length >= limit) break;
        walk(item);
      }
      return;
    }
    const obj = node as Record<string, unknown>;
    if (obj.videoRenderer && typeof obj.videoRenderer === 'object') {
      const vr = obj.videoRenderer as Record<string, unknown>;
      const videoId = typeof vr.videoId === 'string' ? vr.videoId : '';
      if (videoId && !seen.has(videoId)) {
        seen.add(videoId);
        const title = extractTextRuns(vr.title) || 'YouTube Video';
        const channelTitle =
          extractTextRuns(vr.ownerText) ||
          extractTextRuns(vr.longBylineText) ||
          'YouTube Creator';
        const durationLabel = extractTextRuns(vr.lengthText) || 'LIVE';
        const viewCountLabel =
          extractTextRuns(vr.shortViewCountText) ||
          extractTextRuns(vr.viewCountText) ||
          'YouTube';
        const publishedAt =
          extractTextRuns(vr.publishedTimeText) ||
          (durationLabel === 'LIVE' ? 'Live Stream' : 'YouTube');
        const thumbs = (vr.thumbnail as { thumbnails?: Array<{ url?: string }> })
          ?.thumbnails;
        const thumbnailUrl =
          thumbs?.[thumbs.length - 1]?.url ||
          `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        const isLive =
          durationLabel.toUpperCase() === 'LIVE' ||
          title.toLowerCase().includes('live') ||
          title.toLowerCase().includes('radio');

        results.push({
          videoId,
          title,
          channelTitle,
          description: extractTextRuns(vr.descriptionSnippet) || `${channelTitle} · ${viewCountLabel}`,
          thumbnailUrl,
          publishedAt,
          durationLabel,
          viewCountLabel,
          category: isLive ? 'live' : 'music',
          embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`,
          watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
        });
      }
    }

    for (const val of Object.values(obj)) {
      if (results.length >= limit) break;
      if (val && typeof val === 'object') walk(val);
    }
  }

  walk(data);
  return results;
}

export function filterCuratedYouTube(
  query: string,
  filter: 'all' | 'music' | 'live'
): YouTubeSearchResult[] {
  const q = query.trim().toLowerCase();
  return CURATED_YOUTUBE_CATALOG.filter((item) => {
    if (filter === 'live' && item.category !== 'live') return false;
    if (filter === 'music' && item.category !== 'music' && item.category !== 'live') {
      return false;
    }
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.channelTitle.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
    );
  });
}

async function queryOfficialYouTubeApi(
  apiKey: string,
  query: string,
  filter: 'all' | 'music' | 'live',
  maxResults: number
): Promise<YouTubeSearchResult[]> {
  const searchParams = new URLSearchParams({
    key: apiKey,
    part: 'snippet',
    type: 'video',
    maxResults: String(maxResults),
    q: query || 'independent ambient electronic music live session',
    videoEmbeddable: 'true',
  });
  if (filter === 'music') {
    searchParams.set('videoCategoryId', '10');
  } else if (filter === 'live') {
    searchParams.set('eventType', 'live');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`,
      { signal: controller.signal }
    );
    if (!res.ok) {
      throw new Error(`YouTube Data API HTTP ${res.status}`);
    }
    const json = (await res.json()) as {
      items?: Array<{
        id?: { videoId?: string };
        snippet?: {
          title?: string;
          channelTitle?: string;
          description?: string;
          publishedAt?: string;
          liveBroadcastContent?: string;
          thumbnails?: {
            high?: { url?: string };
            medium?: { url?: string };
          };
        };
      }>;
    };

    const items = (json.items ?? []).filter((i) => i.id?.videoId);
    const ids = items.map((i) => i.id!.videoId!).join(',');
    const durationMap = new Map<string, { duration: string; views: string }>();

    if (ids) {
      const detailRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?key=${encodeURIComponent(
          apiKey
        )}&part=contentDetails,statistics&id=${encodeURIComponent(ids)}`
      );
      if (detailRes.ok) {
        const detailJson = (await detailRes.json()) as {
          items?: Array<{
            id?: string;
            contentDetails?: { duration?: string };
            statistics?: { viewCount?: string };
          }>;
        };
        for (const v of detailJson.items ?? []) {
          if (v.id) {
            const viewsNum = Number(v.statistics?.viewCount || 0);
            const viewLabel =
              viewsNum >= 1_000_000
                ? `${(viewsNum / 1_000_000).toFixed(1)}M views`
                : viewsNum >= 1_000
                ? `${Math.round(viewsNum / 1_000)}K views`
                : viewsNum > 0
                ? `${viewsNum} views`
                : 'YouTube';
            durationMap.set(v.id, {
              duration: parseIso8601Duration(v.contentDetails?.duration),
              views: viewLabel,
            });
          }
        }
      }
    }

    return items.map((item) => {
      const videoId = item.id!.videoId!;
      const sn = item.snippet ?? {};
      const details = durationMap.get(videoId);
      const isLive = sn.liveBroadcastContent === 'live';
      return {
        videoId,
        title: decodeHtmlEntities(sn.title || 'Untitled Video'),
        channelTitle: decodeHtmlEntities(sn.channelTitle || 'YouTube Channel'),
        description: decodeHtmlEntities(sn.description || ''),
        thumbnailUrl:
          sn.thumbnails?.high?.url ||
          sn.thumbnails?.medium?.url ||
          `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        publishedAt: sn.publishedAt ? sn.publishedAt.slice(0, 10) : '',
        durationLabel: isLive ? 'LIVE' : details?.duration || 'Video',
        viewCountLabel: details?.views || 'YouTube',
        category: isLive ? 'live' : filter === 'music' ? 'music' : 'video',
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      };
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function queryPublicYouTubeSearch(
  query: string,
  filter: 'all' | 'music' | 'live',
  limit: number
): Promise<YouTubeSearchResult[]> {
  const effectiveQuery =
    filter === 'music'
      ? `${query || 'lofi ambient music'} official audio`
      : filter === 'live'
      ? `${query || 'music'} live stream`
      : query || 'ambient electronic music';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(
        effectiveQuery
      )}`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      }
    );
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const html = await res.text();
    const marker = 'var ytInitialData = ';
    const startIdx = html.indexOf(marker);
    if (startIdx === -1) {
      throw new Error('ytInitialData marker not found');
    }
    const jsonStart = startIdx + marker.length;
    const endIdx = html.indexOf(';</script>', jsonStart);
    if (endIdx === -1) {
      throw new Error('ytInitialData end marker not found');
    }
    const parsed = JSON.parse(html.slice(jsonStart, endIdx));
    const extracted = extractVideoRenderersFromInitialData(parsed, limit);
    if (extracted.length === 0) {
      throw new Error('No video renderers extracted');
    }
    return extracted;
  } finally {
    clearTimeout(timeout);
  }
}

export async function searchYouTube(params: {
  query?: string;
  filter?: 'all' | 'music' | 'live';
  limit?: number;
}): Promise<YouTubeSearchResponse> {
  const query = (params.query ?? '').trim();
  const filter = params.filter ?? 'all';
  const limit = Math.min(Math.max(params.limit ?? 12, 1), 24);
  const cacheKey = `${filter}:${limit}:${query.toLowerCase()}`;

  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  const apiKey = (process.env.YOUTUBE_API_KEY ?? '').trim();

  if (apiKey) {
    try {
      const results = await queryOfficialYouTubeApi(
        apiKey,
        query,
        filter,
        limit
      );
      const payload: YouTubeSearchResponse = {
        query,
        filter,
        sourceMode: 'youtube-api',
        results,
      };
      searchCache.set(cacheKey, {
        expiresAt: Date.now() + 300_000,
        payload,
      });
      return payload;
    } catch {
      // Fall through to public search / curated fallback
    }
  }

  if (query.length > 0) {
    try {
      const results = await queryPublicYouTubeSearch(query, filter, limit);
      const payload: YouTubeSearchResponse = {
        query,
        filter,
        sourceMode: 'youtube-public',
        results,
      };
      searchCache.set(cacheKey, {
        expiresAt: Date.now() + 300_000,
        payload,
      });
      return payload;
    } catch {
      // Fall back gracefully if YouTube public fetch is blocked or throttled
    }
  }

  const curated = filterCuratedYouTube(query, filter);
  return {
    query,
    filter,
    sourceMode: 'curated-fallback',
    results: curated.slice(0, limit),
  };
}
