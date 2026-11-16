import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Headphones,
  Heart,
  ListMusic,
  ListPlus,
  MonitorPlay,
  Play,
  Plus,
  RefreshCw,
  Search as SearchIcon,
  Trash2,
  WifiOff,
  X,
} from 'lucide-react';
import {
  apiFetch,
  type YouTubeSearchResponse,
  type YouTubeSearchResult,
} from '../lib/api.ts';
import { useLibrary } from '../context/LibraryContext.tsx';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';
import { usePlayerStore } from '../store/usePlayerStore.ts';
import { ArtworkImage } from '../components/ArtworkImage.tsx';
import { AddToYouTubePlaylistModal } from '../components/AddToYouTubePlaylistModal.tsx';

const SUGGESTED_YT_QUERIES = [
  'congolese rumba',
  'ndombolo',
  'soukous',
  'afrobeat',
  'lofi',
  'ambient',
  'jazz',
];

const FILTER_TABS: Array<{ id: 'all' | 'music' | 'live'; label: string }> = [
  { id: 'all', label: 'All Videos' },
  { id: 'music', label: 'Music & Audio' },
  { id: 'live', label: 'Live Sessions' },
];

const createYtPlaylistSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Playlist name is required')
    .max(60, 'Max 60 characters'),
});

type CreateYtPlaylistValues = z.infer<typeof createYtPlaylistSchema>;

export const YouTubePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const initialSection = searchParams.get('tab');

  const [sectionTab, setSectionTab] = useState<'search' | 'favorites' | 'playlists'>(
    initialSection === 'favorites' || initialSection === 'playlists'
      ? initialSection
      : 'search'
  );
  const [inputValue, setInputValue] = useState(initialQ);
  const [submittedQuery, setSubmittedQuery] = useState(initialQ);
  const [filter, setFilter] = useState<'all' | 'music' | 'live'>('all');
  const [activeVideo, setActiveVideo] = useState<YouTubeSearchResult | null>(null);
  const [activeQueue, setActiveQueue] = useState<YouTubeSearchResult[]>([]);
  const [playerMode, setPlayerMode] = useState<'video' | 'music'>('video');
  const [playlistModalVideo, setPlaylistModalVideo] =
    useState<YouTubeSearchResult | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  const stageRef = useRef<HTMLElement | null>(null);

  const {
    simulatedOffline,
    youtubeFavorites,
    youtubePlaylists,
    isYouTubeFavorite,
    toggleYouTubeFavorite,
    createYouTubePlaylist,
    deleteYouTubePlaylist,
    removeVideoFromYouTubePlaylist,
  } = useLibrary();
  const isOnline = useOnlineStatus(simulatedOffline);
  const pauseJamendoPlayback = usePlayerStore((s) => s.pausePlayback);

  const {
    register,
    handleSubmit: handleCreatePlaylistForm,
    reset: resetPlaylistForm,
    formState: { errors: playlistErrors, isSubmitting: isCreatingPlaylist },
  } = useForm<CreateYtPlaylistValues>({
    resolver: zodResolver(createYtPlaylistSchema),
  });

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'favorites' || tabParam === 'playlists' || tabParam === 'search') {
      setSectionTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = inputValue.trim();
      setSubmittedQuery(trimmed);
      const next = new URLSearchParams(searchParams);
      if (trimmed) {
        next.set('q', trimmed);
      } else {
        next.delete('q');
      }
      if (next.toString() !== searchParams.toString()) {
        setSearchParams(next, { replace: true });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [inputValue, searchParams, setSearchParams]);

  useEffect(() => {
    if (
      youtubePlaylists.length > 0 &&
      (!selectedPlaylistId ||
        !youtubePlaylists.some((p) => p.id === selectedPlaylistId))
    ) {
      setSelectedPlaylistId(youtubePlaylists[0].id);
    } else if (youtubePlaylists.length === 0) {
      setSelectedPlaylistId(null);
    }
  }, [youtubePlaylists, selectedPlaylistId]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['youtube-search', submittedQuery, filter],
    queryFn: () => {
      const qs = new URLSearchParams({
        q: submittedQuery,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    setSubmittedQuery(trimmed);
    setSectionTab('search');
    if (trimmed) {
      setSearchParams({ q: trimmed }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const handleSelectVideo = (
    video: YouTubeSearchResult,
    mode: 'video' | 'music' = playerMode,
    queue?: YouTubeSearchResult[]
  ) => {
    pauseJamendoPlayback();
    setPlayerMode(mode);
    setActiveVideo(video);
    if (queue && queue.length > 0) {
      setActiveQueue(queue);
    } else if (data?.results?.length) {
      setActiveQueue(data.results);
    }
    requestAnimationFrame(() => {
      stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const activeQueueIndex = activeVideo
    ? activeQueue.findIndex((v) => v.videoId === activeVideo.videoId)
    : -1;
  const hasPrevVideo = activeQueueIndex > 0;
  const hasNextVideo =
    activeQueueIndex !== -1 && activeQueueIndex < activeQueue.length - 1;

  const handlePrevVideo = () => {
    if (!hasPrevVideo) return;
    const prev = activeQueue[activeQueueIndex - 1];
    if (prev) setActiveVideo(prev);
  };

  const handleNextVideo = () => {
    if (!hasNextVideo) return;
    const next = activeQueue[activeQueueIndex + 1];
    if (next) setActiveVideo(next);
  };

  const onCreatePlaylist = async (values: CreateYtPlaylistValues) => {
    const created = await createYouTubePlaylist(values.name);
    setSelectedPlaylistId(created.id);
    resetPlaylistForm();
  };

  const selectedPlaylist =
    youtubePlaylists.find((p) => p.id === selectedPlaylistId) || null;

  const renderVideoCard = (
    video: YouTubeSearchResult,
    queueList: YouTubeSearchResult[],
    extraAction?: React.ReactNode
  ) => {
    const isSelected = activeVideo?.videoId === video.videoId;
    const faved = isYouTubeFavorite(video.videoId);
    return (
      <article
        key={video.videoId}
        className={`group rounded-xl border bg-[#15151B] p-3.5 flex flex-col justify-between gap-3 transition-colors ${
          isSelected
            ? 'border-violet-500/70 bg-[#181822]'
            : 'border-[#22222E] hover:border-[#343446]'
        }`}
      >
        <div>
          <button
            type="button"
            onClick={() => handleSelectVideo(video, 'video', queueList)}
            aria-label={`Play ${video.title}`}
            className="relative block w-full overflow-hidden rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <ArtworkImage
              src={video.thumbnailUrl}
              alt={video.title}
              className="aspect-video w-full rounded-lg"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </span>
            </span>
          </button>

          <h3 className="mt-3 text-sm font-semibold text-[#F5F5F7] line-clamp-2 leading-snug">
            {video.title}
          </h3>
          <p className="mt-1.5 text-xs text-[#9494A3] truncate">
            {video.channelTitle} · {video.durationLabel} · {video.viewCountLabel}
          </p>
        </div>

        <div className="flex items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => handleSelectVideo(video, 'video', queueList)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-600/15 border border-violet-500/30 px-2.5 py-2 text-xs font-medium text-violet-200 hover:bg-violet-600 hover:text-white transition-colors whitespace-nowrap min-h-[40px]"
          >
            <MonitorPlay className="w-3.5 h-3.5" />
            <span>Watch</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectVideo(video, 'music', queueList)}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#2A2A38] bg-[#181820] px-2.5 py-2 text-xs font-medium text-[#D4D4DF] hover:border-violet-500/50 hover:text-white transition-colors whitespace-nowrap min-h-[40px]"
            aria-label={`Listen to ${video.title} in music focus mode`}
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
            className={`min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg border transition-colors ${
              faved
                ? 'border-violet-500/50 bg-violet-600/20 text-violet-300'
                : 'border-[#2A2A38] bg-[#181820] text-[#9494A3] hover:text-white'
            }`}
          >
            <Heart className={`w-4 h-4 ${faved ? 'fill-current' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setPlaylistModalVideo(video)}
            aria-label={`Add ${video.title} to YouTube playlist`}
            className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg border border-[#2A2A38] bg-[#181820] text-[#9494A3] hover:text-white transition-colors"
          >
            <ListPlus className="w-4 h-4" />
          </button>
          {extraAction}
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#F5F5F7]">
            YouTube Music & Video
          </h1>
          <p className="mt-1 text-sm text-[#9494A3]">
            Search tracks, live sessions, and music videos — save favorites,
            build playlists, and watch or listen directly inside Vesper Audio.
          </p>
        </div>
        <Link
          to="/search"
          className="text-xs font-medium text-violet-400 hover:text-violet-300 whitespace-nowrap self-start sm:self-auto"
        >
          Switch to Jamendo Catalog →
        </Link>
      </div>

      {/* Primary Section Tabs */}
      <div
        role="tablist"
        aria-label="YouTube sections"
        className="flex items-center gap-1 p-1 rounded-lg bg-[#15151B] border border-[#22222E] w-fit max-w-full overflow-x-auto"
      >
        {(
          [
            ['search', 'Search'],
            ['favorites', `Favorites (${youtubeFavorites.length})`],
            ['playlists', `Playlists (${youtubePlaylists.length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={sectionTab === id}
            onClick={() => {
              setSectionTab(id);
              const next = new URLSearchParams(searchParams);
              if (id === 'search') {
                next.delete('tab');
              } else {
                next.set('tab', id);
              }
              setSearchParams(next, { replace: true });
            }}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              sectionTab === id
                ? 'bg-violet-600 text-white'
                : 'text-[#9494A3] hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Offline Notice for Search Tab (Saved Favorites & Playlists remain browsable!) */}
      {!isOnline && (
        <div className="rounded-xl border border-amber-500/30 bg-[#1B1712] p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs sm:text-sm text-amber-100">
            <WifiOff className="w-5 h-5 text-amber-400 shrink-0" />
            <span>
              You are offline. Saved Favorites & Playlists can be browsed here,
              while live YouTube streaming requires internet.
            </span>
          </div>
          <Link
            to="/downloads"
            className="inline-flex items-center rounded-lg bg-violet-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-violet-500 whitespace-nowrap"
          >
            Go to Offline Locker
          </Link>
        </div>
      )}

      {/* Search Form (always shown on search tab when online, or quick-jump) */}
      {sectionTab === 'search' && isOnline && (
        <>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-2.5 max-w-2xl"
          >
            <div className="relative flex-1">
              <SearchIcon className="w-4 h-4 text-[#9494A3] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <label htmlFor="youtube-search-input" className="sr-only">
                Search YouTube music and videos
              </label>
              <input
                id="youtube-search-input"
                type="search"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Search Congolese rumba, afrobeat, live sets, or music videos..."
                className="w-full rounded-xl border border-[#2A2A38] bg-[#15151B] pl-11 pr-4 py-3 text-sm text-[#F5F5F7] placeholder:text-[#666678] focus:border-violet-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium text-white hover:bg-violet-500 transition-colors whitespace-nowrap shrink-0"
            >
              Search YouTube
            </button>
          </form>

          {/* Suggestions & Filter Tabs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[#666678]">Try:</span>
              {SUGGESTED_YT_QUERIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setInputValue(q);
                    setSubmittedQuery(q);
                  }}
                  className={`rounded-md px-2.5 py-1 transition-colors ${
                    submittedQuery.toLowerCase() === q
                      ? 'bg-violet-600/20 text-violet-300 border border-violet-500/40'
                      : 'bg-[#1A1A22] text-[#9494A3] hover:text-white border border-transparent'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>

            <div
              role="tablist"
              aria-label="YouTube result filter"
              className="flex items-center gap-1 p-1 rounded-lg bg-[#15151B] border border-[#22222E] w-fit"
            >
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                    filter === tab.id
                      ? 'bg-violet-600 text-white'
                      : 'text-[#9494A3] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* In-App YouTube Player Stage */}
      {activeVideo && isOnline && (
        <section
          ref={stageRef}
          aria-label="YouTube player stage"
          className="rounded-2xl border border-[#2A2A38] bg-[#15151B] overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#22222E] px-4 py-3 sm:px-5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-violet-400">
                Now Streaming in App
                {activeQueue.length > 1 && activeQueueIndex !== -1
                  ? ` · ${activeQueueIndex + 1} of ${activeQueue.length}`
                  : ''}
              </p>
              <h2 className="truncate text-sm sm:text-base font-semibold text-[#F5F5F7]">
                {activeVideo.title}
              </h2>
            </div>

            <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0">
              {activeQueue.length > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={!hasPrevVideo}
                    onClick={handlePrevVideo}
                    aria-label="Previous YouTube video"
                    className="min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg border border-[#2A2A38] bg-[#181820] text-[#D4D4DF] hover:text-white disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={!hasNextVideo}
                    onClick={handleNextVideo}
                    aria-label="Next YouTube video"
                    className="min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg border border-[#2A2A38] bg-[#181820] text-[#D4D4DF] hover:text-white disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center rounded-lg border border-[#262632] bg-[#101015] p-0.5">
                <button
                  type="button"
                  onClick={() => setPlayerMode('video')}
                  aria-pressed={playerMode === 'video'}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                    playerMode === 'video'
                      ? 'bg-violet-600 text-white'
                      : 'text-[#9494A3] hover:text-white'
                  }`}
                >
                  <MonitorPlay className="w-3.5 h-3.5" />
                  <span>Video View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlayerMode('music')}
                  aria-pressed={playerMode === 'music'}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                    playerMode === 'music'
                      ? 'bg-violet-600 text-white'
                      : 'text-[#9494A3] hover:text-white'
                  }`}
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>Music Focus</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void toggleYouTubeFavorite(activeVideo)}
                  aria-label={
                    isYouTubeFavorite(activeVideo.videoId)
                      ? `Remove ${activeVideo.title} from YouTube favorites`
                      : `Save ${activeVideo.title} to YouTube favorites`
                  }
                  className={`inline-flex items-center justify-center rounded-lg border p-2 transition-colors ${
                    isYouTubeFavorite(activeVideo.videoId)
                      ? 'border-violet-500/50 bg-violet-600/20 text-violet-300'
                      : 'border-[#2A2A38] bg-[#181820] text-[#9494A3] hover:text-white'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${
                      isYouTubeFavorite(activeVideo.videoId) ? 'fill-current' : ''
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => setPlaylistModalVideo(activeVideo)}
                  aria-label={`Add ${activeVideo.title} to YouTube playlist`}
                  className="inline-flex items-center justify-center rounded-lg border border-[#2A2A38] bg-[#181820] p-2 text-[#9494A3] hover:text-white"
                >
                  <ListPlus className="w-4 h-4" />
                </button>

                <a
                  href={activeVideo.watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${activeVideo.title} on YouTube`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A2A38] bg-[#181820] px-3 py-1.5 text-xs font-medium text-[#D4D4DF] hover:border-violet-500/50 hover:text-white whitespace-nowrap"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">YouTube</span>
                </a>

                <button
                  type="button"
                  onClick={() => setActiveVideo(null)}
                  aria-label="Close YouTube player"
                  className="inline-flex items-center justify-center rounded-lg border border-[#2A2A38] bg-[#181820] p-2 text-[#9494A3] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {playerMode === 'video' ? (
            <div className="bg-black">
              <div className="aspect-video w-full max-h-[420px] mx-auto">
                <iframe
                  key={activeVideo.videoId}
                  src={activeVideo.embedUrl}
                  title={activeVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 bg-[#121218]">
              <div className="w-full sm:w-64 shrink-0 overflow-hidden rounded-xl border border-[#262632] bg-black aspect-video">
                <iframe
                  key={`${activeVideo.videoId}-music`}
                  src={activeVideo.embedUrl}
                  title={`${activeVideo.title} audio player`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-xs font-medium text-violet-400">
                  Music Focus Mode
                </p>
                <h3 className="font-display text-lg font-semibold text-[#F5F5F7]">
                  {activeVideo.title}
                </h3>
                <p className="text-xs text-[#9494A3]">
                  {activeVideo.channelTitle} · {activeVideo.durationLabel} ·{' '}
                  {activeVideo.viewCountLabel}
                </p>
                {activeVideo.description && (
                  <p className="text-xs text-[#7E7E90] line-clamp-2 max-w-xl">
                    {activeVideo.description}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#22222E] px-4 py-2.5 sm:px-5 text-[11px] text-[#7E7E90]">
            <span>
              {activeVideo.channelTitle} · {activeVideo.durationLabel} ·{' '}
              {activeVideo.viewCountLabel}
            </span>
            <span>Streamed via official YouTube embed player</span>
          </div>
        </section>
      )}

      {/* TAB 1: SEARCH RESULTS */}
      {sectionTab === 'search' && isOnline && (
        <>
          {isLoading && (
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              aria-busy="true"
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-[#22222E] bg-[#15151B] p-3.5 space-y-3 animate-pulse"
                >
                  <div className="aspect-video w-full rounded-lg bg-[#1D1D26]" />
                  <div className="h-4 w-3/4 rounded bg-[#1D1D26]" />
                  <div className="h-3 w-1/2 rounded bg-[#1D1D26]" />
                </div>
              ))}
            </div>
          )}

          {isError && (
            <div className="rounded-xl border border-rose-500/30 bg-[#1B1317] p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm text-rose-200">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>
                  Unable to reach YouTube search right now. Please try again.
                </span>
              </div>
              <button
                type="button"
                onClick={() => void refetch()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/30 px-3 py-1.5 text-xs font-medium text-rose-100 hover:bg-rose-500/10 whitespace-nowrap"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          )}

          {data && !isLoading && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-[#F5F5F7]">
                  {submittedQuery
                    ? `Results for "${submittedQuery}" (${data.results.length})`
                    : `Featured Music & Live Sessions (${data.results.length})`}
                </h2>
                <p className="text-xs text-[#7E7E90]">
                  {data.sourceMode === 'youtube-api'
                    ? 'YouTube Data API v3'
                    : data.sourceMode === 'youtube-public'
                    ? 'Live YouTube Search'
                    : 'Curated Music & Radio Picks'}
                </p>
              </div>

              {data.results.length === 0 ? (
                <div className="rounded-xl border border-[#22222E] bg-[#15151B] p-8 text-center space-y-3">
                  <p className="text-sm text-[#9494A3]">
                    No YouTube videos matched &ldquo;{submittedQuery}&rdquo;. Try a
                    broader music keyword or clear the filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setInputValue('');
                      setSubmittedQuery('');
                      setFilter('all');
                    }}
                    className="inline-flex items-center rounded-lg border border-[#2A2A38] bg-[#181820] px-4 py-2 text-xs font-medium text-[#F5F5F7] hover:border-violet-500/50"
                  >
                    Reset Search
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.results.map((video) =>
                    renderVideoCard(video, data.results)
                  )}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* TAB 2: SAVED FAVORITES */}
      {sectionTab === 'favorites' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-[#F5F5F7]">
              Saved YouTube Favorites ({youtubeFavorites.length})
            </h2>
            {youtubeFavorites.length > 0 && isOnline && (
              <button
                type="button"
                onClick={() =>
                  handleSelectVideo(youtubeFavorites[0], 'video', youtubeFavorites)
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-violet-500 whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Play All
              </button>
            )}
          </div>

          {youtubeFavorites.length === 0 ? (
            <div className="rounded-xl border border-[#22222E] bg-[#15151B] p-8 text-center space-y-2">
              <Heart className="w-7 h-7 text-[#666678] mx-auto" />
              <p className="text-sm font-medium text-[#F5F5F7]">
                No saved YouTube favorites yet
              </p>
              <p className="text-xs text-[#9494A3] max-w-md mx-auto">
                Tap the heart icon on any YouTube track or music video to
                bookmark it here and sync across your signed-in devices.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {youtubeFavorites.map((video) =>
                renderVideoCard(video, youtubeFavorites)
              )}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: YOUTUBE PLAYLISTS */}
      {sectionTab === 'playlists' && (
        <section className="space-y-5">
          {/* Create Playlist Form */}
          <form
            onSubmit={handleCreatePlaylistForm(onCreatePlaylist)}
            className="rounded-xl border border-[#22222E] bg-[#15151B] p-4 flex flex-col sm:flex-row sm:items-end gap-3"
          >
            <div className="flex-1">
              <label
                htmlFor="create-yt-playlist-name"
                className="block text-xs font-medium text-[#9494A3]"
              >
                Create YouTube Playlist
              </label>
              <input
                id="create-yt-playlist-name"
                type="text"
                placeholder="e.g. Kinshasa Rumba Favorites"
                {...register('name')}
                className="mt-1.5 w-full rounded-lg border border-[#2A2A38] bg-[#0E0E12] px-3 py-2 text-sm text-[#F5F5F7] placeholder:text-[#666678] focus:border-violet-500 focus:outline-none"
              />
              {playlistErrors.name && (
                <p className="mt-1 text-xs text-rose-400">
                  {playlistErrors.name.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={isCreatingPlaylist}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white hover:bg-violet-500 transition-colors whitespace-nowrap min-h-[38px]"
            >
              <Plus className="w-4 h-4" />
              Create Playlist
            </button>
          </form>

          {youtubePlaylists.length === 0 ? (
            <div className="rounded-xl border border-[#22222E] bg-[#15151B] p-8 text-center space-y-2">
              <ListMusic className="w-7 h-7 text-[#666678] mx-auto" />
              <p className="text-sm font-medium text-[#F5F5F7]">
                No YouTube playlists created yet
              </p>
              <p className="text-xs text-[#9494A3] max-w-md mx-auto">
                Create a playlist above or click the playlist icon on any video
                to start organizing YouTube sessions.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Playlist Selector List */}
              <div className="lg:col-span-4 space-y-2">
                {youtubePlaylists.map((pl) => {
                  const isActive = selectedPlaylist?.id === pl.id;
                  return (
                    <div
                      key={pl.id}
                      className={`flex items-center justify-between gap-2 rounded-xl border p-3 transition-colors ${
                        isActive
                          ? 'border-violet-500/60 bg-[#1A1A24]'
                          : 'border-[#22222E] bg-[#15151B] hover:border-[#343446]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedPlaylistId(pl.id)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="truncate text-sm font-semibold text-[#F5F5F7]">
                          {pl.name}
                        </p>
                        <p className="text-xs text-[#9494A3]">
                          {pl.videos.length}{' '}
                          {pl.videos.length === 1 ? 'video' : 'videos'}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteYouTubePlaylist(pl.id)}
                        aria-label={`Delete playlist ${pl.name}`}
                        className="min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg text-[#9494A3] hover:text-rose-400 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Selected Playlist Items */}
              <div className="lg:col-span-8 space-y-4">
                {selectedPlaylist && (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-[#F5F5F7]">
                          {selectedPlaylist.name}
                        </h3>
                        <p className="text-xs text-[#9494A3]">
                          {selectedPlaylist.videos.length}{' '}
                          {selectedPlaylist.videos.length === 1
                            ? 'video'
                            : 'videos'}
                        </p>
                      </div>
                      {selectedPlaylist.videos.length > 0 && isOnline && (
                        <button
                          type="button"
                          onClick={() =>
                            handleSelectVideo(
                              selectedPlaylist.videos[0],
                              'video',
                              selectedPlaylist.videos
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-violet-500 whitespace-nowrap"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Play Playlist
                        </button>
                      )}
                    </div>

                    {selectedPlaylist.videos.length === 0 ? (
                      <div className="rounded-xl border border-[#22222E] bg-[#15151B] p-8 text-center text-xs text-[#9494A3]">
                        This playlist is empty. Search YouTube and click the
                        playlist icon on any video to add tracks here.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedPlaylist.videos.map((video) =>
                          renderVideoCard(
                            video,
                            selectedPlaylist.videos,
                            <button
                              type="button"
                              onClick={() =>
                                void removeVideoFromYouTubePlaylist(
                                  selectedPlaylist.id,
                                  video.videoId
                                )
                              }
                              aria-label={`Remove ${video.title} from ${selectedPlaylist.name}`}
                              className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg border border-[#2A2A38] bg-[#181820] text-[#9494A3] hover:text-rose-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
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
