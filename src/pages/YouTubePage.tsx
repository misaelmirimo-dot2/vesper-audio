import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertCircle,
  Check,
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
import {
  Y2MATE_TARGET_URL,
  copyTextToClipboard,
  getCanonicalYouTubeUrl,
} from '../utils/youtubeShare.ts';

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
  const [copiedY2MateVideoId, setCopiedY2MateVideoId] = useState<string | null>(
    null
  );

  const stageRef = useRef<HTMLElement | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

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
    const next = new URLSearchParams(searchParams);
    next.delete('tab');
    if (trimmed) {
      next.set('q', trimmed);
    } else {
      next.delete('q');
    }
    setSearchParams(next, { replace: true });
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

  const handleCopyForY2Mate = (video: YouTubeSearchResult) => {
    const url = getCanonicalYouTubeUrl(video);
    if (!url) return;
    void copyTextToClipboard(url);
    setCopiedY2MateVideoId(video.videoId);
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = window.setTimeout(() => {
      setCopiedY2MateVideoId(null);
    }, 4000);
  };

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
        className={`group rounded-xl p-3.5 flex flex-col justify-between gap-3 transition-colors ${
          isSelected
            ? 'bg-[#282828] ring-1 ring-[#1ED760]'
            : 'bg-[#181818] hover:bg-[#242424]'
        }`}
      >
        <div>
          <button
            type="button"
            onClick={() => handleSelectVideo(video, 'video', queueList)}
            aria-label={`Play ${video.title}`}
            className="relative block w-full overflow-hidden rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-[#1ED760]"
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
            {video.channelTitle} · {video.durationLabel} · {video.viewCountLabel}
          </p>
        </div>

        <div className="flex items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => handleSelectVideo(video, 'video', queueList)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#1ED760] px-3 py-2 text-xs font-bold text-black hover:bg-[#1FDF64] active:scale-[0.97] transition-all whitespace-nowrap min-h-[40px]"
          >
            <MonitorPlay className="w-3.5 h-3.5" />
            <span>Watch</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectVideo(video, 'music', queueList)}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#282828] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#343434] transition-colors whitespace-nowrap min-h-[40px]"
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
            className={`min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-full transition-colors ${
              faved
                ? 'text-[#1ED760] bg-[#1ED760]/15'
                : 'text-[#B3B3B3] hover:text-white bg-[#282828]'
            }`}
          >
            <Heart className={`w-4 h-4 ${faved ? 'fill-[#1ED760]' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setPlaylistModalVideo(video)}
            aria-label={`Add ${video.title} to YouTube playlist`}
            className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-full bg-[#282828] text-[#B3B3B3] hover:text-white transition-colors"
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
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            YouTube Music &amp; Video
          </h1>
          <p className="mt-1 text-sm text-[#B3B3B3]">
            Stream tracks, live sessions, and music videos — save favorites and
            build playlists directly inside Vesper.
          </p>
        </div>
        <Link
          to="/search"
          className="text-xs font-bold text-[#1ED760] hover:underline whitespace-nowrap self-start sm:self-auto"
        >
          Switch to Jamendo Catalog →
        </Link>
      </div>

      {/* Spotify Pill Section Tabs */}
      <div
        role="tablist"
        aria-label="YouTube sections"
        className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1"
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
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors min-h-[36px] ${
              sectionTab === id
                ? 'bg-[#1ED760] text-black'
                : 'bg-[#242424] text-white hover:bg-[#2E2E2E]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Offline Notice */}
      {!isOnline && (
        <div className="rounded-2xl bg-[#242424] p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs sm:text-sm text-[#E5E5E5]">
            <WifiOff className="w-5 h-5 text-[#1ED760] shrink-0" />
            <span>
              You are offline. Saved Favorites &amp; Playlists can be browsed here,
              while live YouTube streaming requires internet.
            </span>
          </div>
          <Link
            to="/downloads"
            className="inline-flex items-center rounded-full bg-[#1ED760] px-4 py-2 text-xs font-bold text-black hover:bg-[#1FDF64] whitespace-nowrap"
          >
            Go to Offline Locker
          </Link>
        </div>
      )}

      {/* Search Form */}
      {sectionTab === 'search' && isOnline && (
        <>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-2.5 max-w-2xl"
          >
            <div className="relative flex-1">
              <SearchIcon className="w-5 h-5 text-[#121212] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <label htmlFor="youtube-search-input" className="sr-only">
                Search YouTube music and videos
              </label>
              <input
                id="youtube-search-input"
                type="search"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Search Congolese rumba, afrobeat, live sets..."
                className="w-full rounded-lg bg-white pl-12 pr-4 py-3 text-sm font-medium text-[#121212] placeholder:text-[#535353] focus:outline-none focus:ring-2 focus:ring-[#1ED760] min-h-[48px]"
              />
            </div>
            <button
              type="submit"
              className="rounded-full bg-[#1ED760] px-6 py-3 text-sm font-bold text-black hover:bg-[#1FDF64] active:scale-[0.98] transition-all whitespace-nowrap shrink-0 min-h-[48px]"
            >
              Search YouTube
            </button>
          </form>

          {/* Suggestions & Filter Tabs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs pb-1">
              <span className="text-[#B3B3B3] shrink-0">Try:</span>
              {SUGGESTED_YT_QUERIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setInputValue(q);
                    setSubmittedQuery(q);
                  }}
                  className={`rounded-full px-3.5 py-1.5 whitespace-nowrap shrink-0 font-medium transition-colors ${
                    submittedQuery.toLowerCase() === q
                      ? 'bg-white text-black font-semibold'
                      : 'bg-[#242424] text-[#B3B3B3] hover:text-white'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>

            <div
              role="tablist"
              aria-label="YouTube result filter"
              className="flex items-center gap-1.5 shrink-0"
            >
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors min-h-[34px] ${
                    filter === tab.id
                      ? 'bg-[#1ED760] text-black'
                      : 'bg-[#242424] text-white hover:bg-[#2E2E2E]'
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
          className="rounded-2xl bg-[#181818] border border-white/10 overflow-hidden shadow-2xl"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 px-4 sm:px-5 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#1ED760]">
                Now Streaming in App
                {activeQueue.length > 1 && activeQueueIndex !== -1
                  ? ` · ${activeQueueIndex + 1} of ${activeQueue.length}`
                  : ''}
              </p>
              <h2 className="truncate text-sm sm:text-base font-bold text-white">
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
                    className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-full bg-[#242424] text-white hover:bg-[#303030] disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={!hasNextVideo}
                    onClick={handleNextVideo}
                    aria-label="Next YouTube video"
                    className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-full bg-[#242424] text-white hover:bg-[#303030] disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <div className="flex items-center rounded-full bg-[#242424] p-1">
                  <button
                    type="button"
                    onClick={() => setPlayerMode('video')}
                    aria-pressed={playerMode === 'video'}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                      playerMode === 'video'
                        ? 'bg-[#1ED760] text-black'
                        : 'text-[#B3B3B3] hover:text-white'
                    }`}
                  >
                    <MonitorPlay className="w-3.5 h-3.5" />
                    <span>Video</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlayerMode('music')}
                    aria-pressed={playerMode === 'music'}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                      playerMode === 'music'
                        ? 'bg-[#1ED760] text-black'
                        : 'text-[#B3B3B3] hover:text-white'
                    }`}
                  >
                    <Headphones className="w-3.5 h-3.5" />
                    <span>Audio Focus</span>
                  </button>
                </div>

                <a
                  href={Y2MATE_TARGET_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleCopyForY2Mate(activeVideo)}
                  aria-label={`D: copy URL for ${activeVideo.title} and open y2mate`}
                  title="Copy YouTube URL and open y2mate to paste"
                  className={`min-w-[40px] min-h-[40px] inline-flex items-center justify-center gap-1 rounded-full px-3.5 py-2 text-xs font-extrabold transition-colors whitespace-nowrap ${
                    copiedY2MateVideoId === activeVideo.videoId
                      ? 'bg-[#1ED760] text-black'
                      : 'bg-[#242424] text-white hover:bg-[#1ED760] hover:text-black'
                  }`}
                >
                  {copiedY2MateVideoId === activeVideo.videoId && (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>D</span>
                </a>
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
                  className={`min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-full transition-colors ${
                    isYouTubeFavorite(activeVideo.videoId)
                      ? 'bg-[#1ED760]/15 text-[#1ED760]'
                      : 'bg-[#242424] text-[#B3B3B3] hover:text-white'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${
                      isYouTubeFavorite(activeVideo.videoId) ? 'fill-[#1ED760]' : ''
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => setPlaylistModalVideo(activeVideo)}
                  aria-label={`Add ${activeVideo.title} to YouTube playlist`}
                  className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-full bg-[#242424] text-[#B3B3B3] hover:text-white transition-colors"
                >
                  <ListPlus className="w-4 h-4" />
                </button>

                <a
                  href={activeVideo.watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${activeVideo.title} on YouTube`}
                  className="min-h-[40px] inline-flex items-center gap-1.5 rounded-full bg-[#242424] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#303030] transition-colors whitespace-nowrap"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">YouTube</span>
                </a>

                <button
                  type="button"
                  onClick={() => setActiveVideo(null)}
                  aria-label="Close YouTube player"
                  className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-full bg-[#242424] text-[#B3B3B3] hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {playerMode === 'video' ? (
            <div className="bg-black">
              <div className="aspect-video w-full max-h-[480px] mx-auto">
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
            <div className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 bg-[#121212]">
              <div className="w-full sm:w-72 shrink-0 overflow-hidden rounded-xl bg-black aspect-video shadow-lg">
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
                <p className="text-xs font-bold text-[#1ED760]">
                  Music Focus Mode
                </p>
                <h3 className="font-display text-xl font-bold text-white">
                  {activeVideo.title}
                </h3>
                <p className="text-xs text-[#B3B3B3]">
                  {activeVideo.channelTitle} · {activeVideo.durationLabel} ·{' '}
                  {activeVideo.viewCountLabel}
                </p>
                {activeVideo.description && (
                  <p className="text-xs text-[#B3B3B3] line-clamp-2 max-w-xl">
                    {activeVideo.description}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-5 py-3 text-[11px] text-[#B3B3B3]">
            <span>
              {activeVideo.channelTitle} · {activeVideo.durationLabel} ·{' '}
              {activeVideo.viewCountLabel}
            </span>
            {copiedY2MateVideoId === activeVideo.videoId ? (
              <span
                role="status"
                className="font-semibold text-[#1ED760]"
              >
                URL copied to clipboard — paste into y2mate
              </span>
            ) : (
              <span>Official YouTube Player</span>
            )}
          </div>
        </section>
      )}

      {/* SEARCH TAB */}
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
                  className="rounded-xl bg-[#181818] p-3.5 space-y-3 animate-pulse"
                >
                  <div className="aspect-video w-full rounded-lg bg-[#282828]" />
                  <div className="h-4 w-3/4 rounded bg-[#282828]" />
                  <div className="h-3 w-1/2 rounded bg-[#242424]" />
                </div>
              ))}
            </div>
          )}

          {isError && (
            <div className="rounded-xl bg-[#2A181B] border border-rose-500/30 p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm text-rose-200">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>
                  Unable to reach YouTube search right now. Please try again.
                </span>
              </div>
              <button
                type="button"
                onClick={() => void refetch()}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-black whitespace-nowrap"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          )}

          {data && !isLoading && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-lg font-bold text-white">
                  {submittedQuery
                    ? `Results for "${submittedQuery}" (${data.results.length})`
                    : `Featured Music & Live Sessions (${data.results.length})`}
                </h2>
                <p className="text-xs text-[#B3B3B3]">
                  {data.sourceMode === 'youtube-api'
                    ? 'YouTube Data API v3'
                    : data.sourceMode === 'youtube-public'
                    ? 'Live YouTube Search'
                    : 'Curated Music & Radio Picks'}
                </p>
              </div>

              {data.results.length === 0 ? (
                <div className="rounded-2xl bg-[#181818] p-10 text-center space-y-3">
                  <p className="text-sm text-[#B3B3B3]">
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
                    className="inline-flex items-center rounded-full bg-[#242424] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#303030]"
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

      {/* FAVORITES TAB */}
      {sectionTab === 'favorites' && (
        <section className="space-y-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-white">
              Saved YouTube Favorites ({youtubeFavorites.length})
            </h2>
            {youtubeFavorites.length > 0 && isOnline && (
              <button
                type="button"
                onClick={() =>
                  handleSelectVideo(youtubeFavorites[0], 'video', youtubeFavorites)
                }
                className="inline-flex items-center gap-2 rounded-full bg-[#1ED760] px-5 py-2.5 text-xs font-bold text-black hover:bg-[#1FDF64] active:scale-[0.97] transition-all whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                Play All
              </button>
            )}
          </div>

          {youtubeFavorites.length === 0 ? (
            <div className="rounded-2xl bg-[#181818] p-10 text-center space-y-3">
              <Heart className="w-8 h-8 text-[#B3B3B3] mx-auto" />
              <p className="text-sm font-bold text-white">
                No saved YouTube favorites yet
              </p>
              <p className="text-xs text-[#B3B3B3] max-w-md mx-auto">
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

      {/* PLAYLISTS TAB */}
      {sectionTab === 'playlists' && (
        <section className="space-y-6">
          <form
            onSubmit={handleCreatePlaylistForm(onCreatePlaylist)}
            className="rounded-2xl bg-[#181818] p-5 flex flex-col sm:flex-row sm:items-end gap-3.5"
          >
            <div className="flex-1">
              <label
                htmlFor="create-yt-playlist-name"
                className="block text-xs font-semibold text-[#B3B3B3] mb-1.5"
              >
                Create YouTube Playlist
              </label>
              <input
                id="create-yt-playlist-name"
                type="text"
                placeholder="e.g. Kinshasa Rumba Favorites"
                {...register('name')}
                className="w-full rounded-lg bg-[#242424] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-[#727272] focus:border-[#1ED760] focus:outline-none min-h-[44px]"
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
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1ED760] px-6 py-2.5 text-xs font-bold text-black hover:bg-[#1FDF64] active:scale-[0.97] transition-all whitespace-nowrap min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              Create Playlist
            </button>
          </form>

          {youtubePlaylists.length === 0 ? (
            <div className="rounded-2xl bg-[#181818] p-10 text-center space-y-3">
              <ListMusic className="w-8 h-8 text-[#B3B3B3] mx-auto" />
              <p className="text-sm font-bold text-white">
                No YouTube playlists created yet
              </p>
              <p className="text-xs text-[#B3B3B3] max-w-md mx-auto">
                Create a playlist above or click the playlist icon on any video
                to start organizing YouTube sessions.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4 space-y-2">
                {youtubePlaylists.map((pl) => {
                  const isActive = selectedPlaylist?.id === pl.id;
                  return (
                    <div
                      key={pl.id}
                      className={`flex items-center justify-between gap-2.5 rounded-xl p-3.5 transition-colors ${
                        isActive
                          ? 'bg-[#282828] ring-1 ring-[#1ED760]'
                          : 'bg-[#181818] hover:bg-[#242424]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedPlaylistId(pl.id)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="truncate text-sm font-bold text-white">
                          {pl.name}
                        </p>
                        <p className="text-xs text-[#B3B3B3] mt-0.5">
                          {pl.videos.length}{' '}
                          {pl.videos.length === 1 ? 'video' : 'videos'}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteYouTubePlaylist(pl.id)}
                        aria-label={`Delete playlist ${pl.name}`}
                        className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-full text-[#B3B3B3] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="lg:col-span-8 space-y-4">
                {selectedPlaylist && (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-display text-lg font-bold text-white">
                          {selectedPlaylist.name}
                        </h3>
                        <p className="text-xs text-[#B3B3B3]">
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
                          className="inline-flex items-center gap-2 rounded-full bg-[#1ED760] px-5 py-2.5 text-xs font-bold text-black hover:bg-[#1FDF64] active:scale-[0.97] transition-all whitespace-nowrap"
                        >
                          <Play className="w-3.5 h-3.5 fill-black" />
                          Play Playlist
                        </button>
                      )}
                    </div>

                    {selectedPlaylist.videos.length === 0 ? (
                      <div className="rounded-2xl bg-[#181818] p-10 text-center text-xs text-[#B3B3B3]">
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
                              className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-full bg-[#282828] text-[#B3B3B3] hover:text-rose-400 transition-colors"
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
