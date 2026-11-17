import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Clock,
  Disc3,
  Headphones,
  Heart,
  ListPlus,
  MonitorPlay,
  Play,
  Search as SearchIcon,
  WifiOff,
} from 'lucide-react';
import {
  apiFetch,
  type YouTubeSearchResponse,
  type YouTubeSearchResult,
} from '../lib/api.ts';
import { useLibrary } from '../context/LibraryContext.tsx';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';
import { usePlayerStore } from '../store/usePlayerStore.ts';
import { getGenreTileColor } from '../utils/spotifyTheme.ts';
import {
  YOUTUBE_BROWSE_CATEGORIES,
  YOUTUBE_SUGGESTED_QUERIES,
  buildYouTubePlayUrl,
} from '../utils/youtubeSuggestions.ts';
import { ArtworkImage } from '../components/ArtworkImage.tsx';
import { AddToYouTubePlaylistModal } from '../components/AddToYouTubePlaylistModal.tsx';

export const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';

  const [inputValue, setInputValue] = useState(initialQ);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQ);
  const [filter, setFilter] = useState<'all' | 'music' | 'live'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [playlistModalVideo, setPlaylistModalVideo] =
    useState<YouTubeSearchResult | null>(null);

  const {
    simulatedOffline,
    recentSearches,
    addRecentSearch,
    isYouTubeFavorite,
    toggleYouTubeFavorite,
  } = useLibrary();
  const isOnline = useOnlineStatus(simulatedOffline);
  const { pausePlayback } = usePlayerStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = inputValue.trim();
      setDebouncedQuery(trimmed);
      if (trimmed.length >= 2) {
        void addRecentSearch(trimmed);
      }
      if (trimmed) {
        setSearchParams({ q: trimmed }, { replace: true });
      } else {
        setSearchParams({}, { replace: true });
      }
    }, 320);
    return () => clearTimeout(timer);
  }, [inputValue, setSearchParams]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['search-youtube', debouncedQuery, filter],
    queryFn: () => {
      const qs = new URLSearchParams({
        q: debouncedQuery,
        filter,
        limit: '12',
      });
      return apiFetch<YouTubeSearchResponse>(
        `/api/youtube/search?${qs.toString()}`
      );
    },
    enabled: isOnline,
    staleTime: 60_000,
  });

  const handleSelectCategory = (label: string, query: string, catFilter: 'all' | 'music' | 'live') => {
    if (selectedCategory === label) {
      setSelectedCategory('');
      setInputValue('');
      setFilter('all');
    } else {
      setSelectedCategory(label);
      setInputValue(query);
      setFilter(catFilter);
    }
  };

  const openInYouTubePlayer = (
    video: YouTubeSearchResult,
    queue: YouTubeSearchResult[],
    mode: 'video' | 'music' = 'video'
  ) => {
    pausePlayback();
    navigate(
      buildYouTubePlayUrl({
        videoId: video.videoId,
        mode,
        query: debouncedQuery || undefined,
      }),
      {
        state: {
          initialVideo: video,
          initialQueue: queue,
          initialMode: mode,
        },
      }
    );
  };

  if (!isOnline) {
    return (
      <div className="rounded-2xl bg-[#181818] p-8 text-center space-y-3">
        <WifiOff className="w-8 h-8 text-[#1ED760] mx-auto" />
        <h1 className="font-display text-xl font-bold text-white">
          Search requires an internet connection
        </h1>
        <p className="text-sm text-[#B3B3B3] max-w-md mx-auto">
          Live YouTube search is unavailable while offline. Open your Offline
          Downloads to play saved audio and video files.
        </p>
        <div className="pt-2">
          <Link
            to="/downloads"
            className="inline-flex items-center rounded-full bg-[#1ED760] px-5 py-2.5 text-xs font-bold text-black hover:bg-[#1FDF64]"
          >
            Go to Offline Downloads
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            Search YouTube
          </h1>
          <p className="mt-1 text-sm text-[#B3B3B3]">
            Explore YouTube music videos, live sessions, and audio mixes.
          </p>
        </div>
        <Link
          to={
            inputValue.trim()
              ? `/youtube?q=${encodeURIComponent(inputValue.trim())}`
              : '/youtube'
          }
          className="inline-flex items-center gap-1.5 rounded-full bg-[#242424] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2E2E2E] whitespace-nowrap self-start sm:self-auto"
        >
          <MonitorPlay className="w-3.5 h-3.5 text-[#1ED760]" />
          <span>Open Full YouTube Player</span>
        </Link>
      </div>

      {/* High-Contrast Spotify Search Bar */}
      <div className="relative max-w-2xl">
        <SearchIcon className="w-5 h-5 text-[#121212] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <label htmlFor="global-search-input" className="sr-only">
          Search YouTube music and videos
        </label>
        <input
          id="global-search-input"
          type="search"
          value={inputValue}
          onChange={(e) => {
            setSelectedCategory('');
            setInputValue(e.target.value);
          }}
          placeholder="Search YouTube music or videos..."
          className="w-full rounded-lg bg-white pl-12 pr-4 py-3 text-sm font-medium text-[#121212] placeholder:text-[#535353] focus:outline-none focus:ring-2 focus:ring-[#1ED760] min-h-[48px]"
        />
      </div>

      {/* Recent Searches & YouTube Suggestions */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {recentSearches.length > 0 && (
          <span className="inline-flex items-center gap-1 text-[#B3B3B3] mr-1">
            <Clock className="w-3.5 h-3.5" />
            Recent:
          </span>
        )}
        {recentSearches.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setSelectedCategory('');
              setInputValue(item);
            }}
            className="rounded-full bg-[#242424] px-3.5 py-1.5 font-medium text-white hover:bg-[#303030] transition-colors"
          >
            {item}
          </button>
        ))}
        <span className="text-[#727272] mx-1">Suggested:</span>
        {YOUTUBE_SUGGESTED_QUERIES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setSelectedCategory('');
              setInputValue(s);
            }}
            className="rounded-full bg-[#1E1E1E] px-3.5 py-1.5 font-medium text-[#B3B3B3] hover:text-white hover:bg-[#2A2A2A] transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {(
          [
            ['all', 'All Videos'],
            ['music', 'Music & Audio'],
            ['live', 'Live Sessions'],
          ] as const
        ).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[36px] ${
              filter === tab
                ? 'bg-[#1ED760] text-black'
                : 'bg-[#242424] text-white hover:bg-[#2E2E2E]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Spotify Colored Browse YouTube Category Tiles */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-white">
            Browse YouTube Categories
          </h2>
          {selectedCategory && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('');
                setInputValue('');
                setFilter('all');
              }}
              className="text-xs font-semibold text-[#1ED760] hover:underline"
            >
              Clear filter ({selectedCategory})
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {YOUTUBE_BROWSE_CATEGORIES.map((cat, idx) => {
            const bg = getGenreTileColor(cat.label, idx);
            const active = selectedCategory === cat.label;
            return (
              <button
                key={cat.label}
                type="button"
                onClick={() =>
                  handleSelectCategory(cat.label, cat.query, cat.filter)
                }
                style={{ backgroundColor: bg }}
                className={`relative overflow-hidden rounded-xl p-4 h-24 text-left transition-transform active:scale-[0.97] hover:brightness-110 ${
                  active
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-[#121212]'
                    : ''
                }`}
              >
                <span className="relative z-10 text-base font-extrabold text-white leading-tight block">
                  {cat.label}
                </span>
                <Disc3
                  aria-hidden="true"
                  className="w-16 h-16 text-black/25 absolute -bottom-2 -right-2 rotate-12 pointer-events-none"
                />
              </button>
            );
          })}
        </div>
      </section>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-xl bg-[#181818] p-3.5 space-y-3 animate-pulse"
            >
              <div className="aspect-video w-full rounded-lg bg-[#282828]" />
              <div className="h-4 w-3/4 rounded bg-[#282828]" />
              <div className="h-3 w-1/2 rounded bg-[#242424]" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="rounded-xl bg-[#2A181B] border border-rose-500/30 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-rose-200">
            <AlertCircle className="w-5 h-5 text-rose-400" />
            <span>YouTube search request failed. Please try again.</span>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-full bg-white px-4 py-1.5 text-xs font-bold text-black"
          >
            Retry
          </button>
        </div>
      )}

      {/* YouTube Results */}
      {data && !isLoading && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-white">
              {debouncedQuery
                ? `YouTube Results for "${debouncedQuery}" (${data.results.length})`
                : `Featured YouTube Videos (${data.results.length})`}
            </h2>
          </div>

          {data.results.length === 0 ? (
            <div className="rounded-2xl bg-[#181818] p-8 text-center text-sm text-[#B3B3B3]">
              No matching YouTube videos found. Try another suggested topic above.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.results.map((video) => {
                const faved = isYouTubeFavorite(video.videoId);
                return (
                  <article
                    key={video.videoId}
                    className="group rounded-xl bg-[#181818] hover:bg-[#242424] p-3.5 flex flex-col justify-between gap-3 transition-colors"
                  >
                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          openInYouTubePlayer(video, data.results, 'video')
                        }
                        aria-label={`Play ${video.title}`}
                        className="relative block w-full overflow-hidden rounded-lg text-left"
                      >
                        <ArtworkImage
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="aspect-video w-full rounded-lg transition-transform group-hover:scale-105"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1ED760] text-black shadow-xl">
                            <Play className="w-5 h-5 fill-black ml-0.5" />
                          </span>
                        </span>
                      </button>

                      <h3 className="mt-3 text-sm font-bold text-white line-clamp-2 leading-snug">
                        {video.title}
                      </h3>
                      <p className="mt-1 text-xs text-[#B3B3B3] truncate">
                        {video.channelTitle} · {video.durationLabel} ·{' '}
                        {video.viewCountLabel}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          openInYouTubePlayer(video, data.results, 'video')
                        }
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#1ED760] px-3 py-2 text-xs font-bold text-black hover:bg-[#1FDF64] transition-colors whitespace-nowrap min-h-[40px]"
                      >
                        <MonitorPlay className="w-3.5 h-3.5" />
                        <span>Watch</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          openInYouTubePlayer(video, data.results, 'music')
                        }
                        aria-label={`Listen to ${video.title} in audio focus`}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#282828] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#343434] transition-colors whitespace-nowrap min-h-[40px]"
                      >
                        <Headphones className="w-3.5 h-3.5" />
                        <span>Listen</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleYouTubeFavorite(video)}
                        aria-label={
                          faved
                            ? `Remove ${video.title} from YouTube favorites`
                            : `Save ${video.title} to YouTube favorites`
                        }
                        className={`min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-full transition-colors ${
                          faved
                            ? 'text-[#1ED760] bg-[#1ED760]/15'
                            : 'text-[#B3B3B3] hover:text-white bg-[#282828]'
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            faved ? 'fill-[#1ED760]' : ''
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlaylistModalVideo(video)}
                        aria-label={`Add ${video.title} to YouTube playlist`}
                        className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-full bg-[#282828] text-[#B3B3B3] hover:text-white transition-colors"
                      >
                        <ListPlus className="w-4 h-4" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      <AddToYouTubePlaylistModal
        video={playlistModalVideo}
        onClose={() => setPlaylistModalVideo(null)}
      />
    </div>
  );
};
