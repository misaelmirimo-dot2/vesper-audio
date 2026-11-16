import type {
  NormalizedAlbum,
  NormalizedArtist,
  NormalizedTrack,
} from '../types/music.ts';

export async function apiFetch<T>(
  url: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, headers, ...rest } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        (data as { error?: string; reason?: string }).error ||
          (data as { reason?: string }).reason ||
          `Request failed (${res.status})`
      );
    }
    return data as T;
  } finally {
    clearTimeout(timeout);
  }
}

export interface DiscoverResponse {
  sourceMode: 'jamendo-live' | 'development-catalog';
  featured: NormalizedTrack[];
  popular: NormalizedTrack[];
  trending: NormalizedTrack[];
  instrumental: NormalizedTrack[];
  vocal: NormalizedTrack[];
  albums: NormalizedAlbum[];
  genres: string[];
}

export interface SearchResponse {
  sourceMode: 'jamendo-live' | 'development-catalog';
  tracks: NormalizedTrack[];
  artists: NormalizedArtist[];
  albums: NormalizedAlbum[];
  totalCount: number;
  hasMore: boolean;
}

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

