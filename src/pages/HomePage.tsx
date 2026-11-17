import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Download,
  Headphones,
  Heart,
  ListPlus,
  MonitorPlay,
  Play,
  RefreshCw,
  Search,
  Video,
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
import { getGreetingForHour } from '../utils/spotifyTheme.ts';
import {
  YOUTUBE_SUGGESTED_QUERIES,
  buildYouTubePlayUrl,
} from '../utils/youtubeSuggestions.ts';
import { localMediaToNormalizedTrack } from '../utils/localMedia.ts';
import { ArtworkImage } from '../components/ArtworkImage.tsx';
import { TrackRow } from '../components/TrackRow.tsx';
import { AddToYouTubePlaylistModal } from '../components/AddToYouTubePlaylistModal.tsx';

export const HomePage: React.FC<{ mode?: 'home' | 'discover' }> = ({
  mode = 'home',
}) => {
  const navigate = useNavigate();
  const {
    simulatedOffline,
    downloads,
    localMedia,
    youtubeFavorites,
    isYouTubeFavorite,
    toggleYouTubeFavorite,
  } = useLibrary();
  const isOnline = useOnlineStatus(simulatedOffline);
  const { pausePlayback } = usePlayerStore();

  const [quickQuery, setQuickQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [videoFilter, setVideoFilter] = useState<'all' | 'music' | 'live'>(
    'all'
  );
  const [playlistModalVideo, setPlaylistModalVideo] =
    useState<YouTubeSearchResult | null>(null);

  const greeting = useMemo(
    () =>
      mode === 'discover'
        ? 'Discover YouTube Music'
        : getGreetingForHour(new Date().getHours()),
    [mode]
  );

  const featuredQuery = useQuery({
    queryKey: ['youtube-home-featured'],
    queryFn: () =>
      apiFetch<YouTubeSearchResponse>(
        '/api/youtube/search?q=&filter=all&limit=12'
      ),
    enabled: isOnline,
    staleTime: 60_000,
  });

  const liveQuery = useQuery({
    queryKey: ['youtube-home-live'],
    queryFn: () =>
      apiFetch<YouTubeSearchResponse>(
        '/api/youtube/search?q=&filter=live&limit=6'
      ),
    enabled: isOnline,
    staleTime: 60_000,
  });

  const suggestionsQuery = useQuery({
    queryKey: ['youtube-home-suggestions', selectedTopic, videoFilter],
    queryFn: () => {
      const q = selectedTopic === 'All' ? 'afrobeat rumba lofi music' : selectedTopic;
      const qs = new URLSearchParams({
        q,
        filter: videoFilter,
        limit: '12',
      });
      return apiFetch<YouTubeSearchResponse>(
        `/api/youtube/search?${qs.toString()}`
      );
    },
    enabled: isOnline,
    staleTime: 60_000,
  });

  const openYouTubeVideo = (
    video: YouTubeSearchResult,
    queue: YouTubeSearchResult[],
    initialMode: 'video' | 'music' = 'video'
  ) => {
    pausePlayback();
    navigate(
      buildYouTubePlayUrl({
        videoId: video.videoId,
        mode: initialMode,
      }),
      {
        state: {
          initialVideo: video,
          initialQueue: queue,
          initialMode,
        },
      }
    );
  };

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = quickQuery.trim();
    if (q) {
      navigate(`/youtube?q=${encodeURIComponent(q)}`);
    } else {
      navigate('/youtube');
    }
  };

  const completedDownloads = downloads.filter((d) => d.status === 'completed');
  const offlineCount = completedDownloads.length + localMedia.length;

  if (!isOnline) {
    const localAudioTracks = localMedia
      .filter((m) => m.mediaType === 'audio')
      .map(localMediaToNormalizedTrack);
    const offlineTracks = [
      ...localAudioTracks,
      ...completedDownloads.map((d) => d.track),
    ];

    return (
      <div className="space-y-8">
        <section className="rounded-2xl bg-gradient-to-b from-[#1A3525] to-[#181818] p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1ED760]">
            <WifiOff className="w-4 h-4" />
            <span>Offline Listening Mode</span>
          </div>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold text-white">
            Your offline music &amp; downloads
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#B3B3B3]">
            YouTube streaming is paused while offline. Play your downloaded audio
            and local media files below.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-white mb-3">
            Offline Downloads ({offlineTracks.length})
          </h2>
          {offlineTracks.length === 0 ? (
            <div className="rounded-2xl bg-[#181818] p-8 text-center">
              <p className="text-sm text-[#B3B3B3]">
                No offline downloads found yet. Open Offline Downloads to link
                your Downloads folder or import audio files.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {offlineTracks.map((track, i) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={i}
                  queueContext={offlineTracks}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  const featuredVideos = featuredQuery.data?.results ?? [];
  const liveVideos = liveQuery.data?.results ?? [];
  const suggestedVideos = suggestionsQuery.data?.results ?? [];
  const heroVideo = featuredVideos[0];
  const quickPickVideos = featuredVideos.slice(0, 4);
  const trendingVideos = featuredVideos.slice(2, 8);

  return (
    <div className="space-y-8">
      {/* Spotify Ambient Gradient Top Header & Quick-Pick Grid */}
      <section className="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-6 px-4 pt-3 pb-4 sm:px-6 sm:pt-6 lg:px-8 bg-gradient-to-b from-[#173A25]/80 via-[#121212]/90 to-[#121212]">
        {/* Spotify iOS Filter Chips Row */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-4">
          <Link
            to="/"
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors min-h-[34px] inline-flex items-center ${
              mode === 'home'
                ? 'bg-[#1ED760] text-black'
                : 'bg-[#2A2A2A] text-white hover:bg-[#343434]'
            }`}
          >
            All
          </Link>
          <Link
            to="/discover"
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors min-h-[34px] inline-flex items-center ${
              mode === 'discover'
                ? 'bg-[#1ED760] text-black'
                : 'bg-[#2A2A2A] text-white hover:bg-[#343434]'
            }`}
          >
            Music Videos
          </Link>
          <Link
            to="/youtube"
            className="px-4 py-1.5 rounded-full text-xs font-semibold bg-[#2A2A2A] text-white hover:bg-[#343434] whitespace-nowrap shrink-0 transition-colors min-h-[34px] inline-flex items-center gap-1.5"
          >
            <Video className="w-3.5 h-3.5 text-[#1ED760]" />
            YouTube Player
          </Link>
          <Link
            to="/downloads"
            className="px-4 py-1.5 rounded-full text-xs font-semibold bg-[#2A2A2A] text-white hover:bg-[#343434] whitespace-nowrap shrink-0 transition-colors min-h-[34px] inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-[#1ED760]" />
            Downloads
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h1
              className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white"
              style={{ textWrap: 'balance' }}
            >
              {greeting}
            </h1>
            <p className="hidden sm:block mt-1 text-sm text-[#B3B3B3]">
              YouTube music videos, live sessions, and your synced offline downloads.
            </p>
          </div>

          <form
            onSubmit={handleQuickSearch}
            className="hidden md:flex items-center gap-2 md:w-[360px] lg:w-[400px] shrink-0"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#B3B3B3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <label htmlFor="home-search" className="sr-only">
                Search YouTube songs and music videos
              </label>
              <input
                id="home-search"
                type="search"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                placeholder="Search YouTube music or video..."
                className="w-full rounded-full bg-[#242424] border border-transparent pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#B3B3B3] focus:border-white/40 focus:bg-[#2A2A2A] focus:outline-none min-h-[44px]"
              />
            </div>
            <button
              type="submit"
              className="rounded-full bg-[#1ED760] px-5 py-2.5 text-xs font-bold text-black hover:bg-[#1FDF64] active:scale-[0.97] transition-all whitespace-nowrap shrink-0 min-h-[44px]"
            >
              Search
            </button>
          </form>
        </div>

        {/* Spotify iOS 2-Column Compact Quick-Pick Grid (YouTube Favorites, Downloads, Featured Videos) */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          <Link
            to="/youtube?tab=favorites"
            className="group flex items-center gap-3 rounded-md bg-white/[0.1] hover:bg-white/[0.18] active:scale-[0.98] transition-all overflow-hidden h-14 sm:h-16"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center bg-gradient-to-br from-[#450AF5] to-[#C4EFD9]">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
            <div className="min-w-0 pr-2">
              <p className="truncate text-xs sm:text-sm font-bold text-white">
                YouTube Favorites
              </p>
              <p className="text-[11px] text-[#B3B3B3] truncate">
                {youtubeFavorites.length} saved
              </p>
            </div>
          </Link>

          <Link
            to="/downloads"
            className="group flex items-center gap-3 rounded-md bg-white/[0.1] hover:bg-white/[0.18] active:scale-[0.98] transition-all overflow-hidden h-14 sm:h-16"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center bg-gradient-to-br from-[#006450] to-[#1ED760]">
              <Download className="w-6 h-6 text-black" />
            </div>
            <div className="min-w-0 pr-2">
              <p className="truncate text-xs sm:text-sm font-bold text-white">
                Offline Downloads
              </p>
              <p className="text-[11px] text-[#B3B3B3] truncate">
                {offlineCount} ready
              </p>
            </div>
          </Link>

          {quickPickVideos.map((video) => (
            <button
              key={video.videoId}
              type="button"
              onClick={() => openYouTubeVideo(video, featuredVideos, 'video')}
              className="group flex items-center gap-3 rounded-md bg-white/[0.1] hover:bg-white/[0.18] active:scale-[0.98] transition-all overflow-hidden h-14 sm:h-16 text-left"
            >
              <ArtworkImage
                src={video.thumbnailUrl}
                alt={video.title}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-none shrink-0"
              />
              <div className="min-w-0 flex-1 pr-2">
                <p className="line-clamp-2 text-xs sm:text-sm font-bold text-white leading-tight">
                  {video.title}
                </p>
              </div>
              <span className="hidden sm:flex mr-3 w-8 h-8 rounded-full bg-[#1ED760] text-black items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg shrink-0">
                <Play className="w-4 h-4 fill-black ml-0.5" />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Desktop Spotlight Hero Card (Featured YouTube Video) */}
      {heroVideo && (
        <section className="hidden lg:grid lg:grid-cols-12 rounded-2xl overflow-hidden bg-gradient-to-r from-[#181818] via-[#1C2A21] to-[#181818] border border-white/[0.06]">
          <div className="lg:col-span-7 p-8 flex flex-col justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#1ED760]">
                Featured YouTube Release
              </p>
              <h2
                className="mt-2 font-display text-3xl font-extrabold text-white line-clamp-2"
                style={{ textWrap: 'balance' }}
              >
                {heroVideo.title}
              </h2>
              <p className="mt-2 text-sm text-[#B3B3B3]">
                {heroVideo.channelTitle} · {heroVideo.durationLabel} ·{' '}
                {heroVideo.viewCountLabel}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => openYouTubeVideo(heroVideo, featuredVideos, 'video')}
                className="inline-flex items-center gap-2 rounded-full bg-[#1ED760] px-6 py-3 text-sm font-bold text-black hover:bg-[#1FDF64] hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>Play Video</span>
              </button>
              <button
                type="button"
                onClick={() => openYouTubeVideo(heroVideo, featuredVideos, 'music')}
                className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-3 text-xs font-bold text-white hover:border-white transition-colors"
              >
                <Headphones className="w-4 h-4" />
                <span>Audio Focus</span>
              </button>
            </div>
          </div>
          <div className="lg:col-span-5 relative min-h-[220px]">
            <ArtworkImage
              src={heroVideo.thumbnailUrl}
              alt={heroVideo.title}
              className="w-full h-full object-cover rounded-none"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1C2A21] via-transparent to-transparent" />
          </div>
        </section>
      )}

      {/* Loading Skeletons */}
      {featuredQuery.isLoading && (
        <div
          className="space-y-6"
          aria-busy="true"
          aria-label="Loading YouTube videos"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="rounded-xl bg-[#181818] p-3 animate-pulse space-y-3"
              >
                <div className="w-full aspect-video rounded-lg bg-[#282828]" />
                <div className="h-4 w-3/4 rounded bg-[#282828]" />
                <div className="h-3 w-1/2 rounded bg-[#242424]" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {featuredQuery.isError && (
        <div className="rounded-xl bg-[#2A181B] border border-rose-500/30 p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-rose-200">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>Unable to load YouTube suggestions from the server.</span>
          </div>
          <button
            type="button"
            onClick={() => void featuredQuery.refetch()}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-black hover:scale-105 transition-transform"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {featuredVideos.length > 0 && (
        <>
          {/* Featured YouTube Releases (Horizontal Snap Carousel on Mobile, Grid on Desktop) */}
          <section>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white">
                Featured Releases
              </h2>
              <Link
                to="/youtube"
                className="text-xs font-bold text-[#B3B3B3] hover:text-white"
              >
                Show all
              </Link>
            </div>
            <div className="flex gap-3.5 overflow-x-auto no-scrollbar snap-x -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 md:grid-cols-4 sm:gap-5">
              {featuredVideos.slice(0, 8).map((video) => (
                <div
                  key={video.videoId}
                  className="group w-[196px] sm:w-auto shrink-0 snap-start sm:rounded-xl sm:bg-[#181818] sm:hover:bg-[#242424] sm:p-3.5 transition-colors"
                >
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        openYouTubeVideo(video, featuredVideos, 'video')
                      }
                      aria-label={`Play ${video.title}`}
                      className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-[#1ED760] rounded-lg"
                    >
                      <ArtworkImage
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full aspect-video rounded-lg shadow-lg"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        openYouTubeVideo(video, featuredVideos, 'video')
                      }
                      aria-label={`Watch ${video.title}`}
                      className="absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-[#1ED760] text-black flex items-center justify-center shadow-xl sm:opacity-0 sm:translate-y-1 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 hover:scale-105 active:scale-95 transition-all"
                    >
                      <Play className="w-4 h-4 fill-black ml-0.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      openYouTubeVideo(video, featuredVideos, 'video')
                    }
                    className="mt-2.5 block w-full text-left truncate text-sm font-bold text-white hover:underline underline-offset-4"
                  >
                    {video.title}
                  </button>
                  <p className="mt-0.5 truncate text-xs text-[#B3B3B3]">
                    {video.channelTitle} · {video.durationLabel}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Live Music Sessions & Radio (YouTube) */}
          {liveVideos.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3.5">
                <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white">
                  Live Sessions &amp; Mixes
                </h2>
                <Link
                  to="/youtube"
                  className="text-xs font-bold text-[#B3B3B3] hover:text-white"
                >
                  Show all
                </Link>
              </div>
              <div className="flex gap-3.5 overflow-x-auto no-scrollbar snap-x -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
                {liveVideos.map((video) => (
                  <button
                    key={video.videoId}
                    type="button"
                    onClick={() => openYouTubeVideo(video, liveVideos, 'music')}
                    className="group w-[200px] sm:w-auto shrink-0 snap-start sm:rounded-xl sm:bg-[#181818] sm:hover:bg-[#242424] sm:p-3 transition-colors text-left"
                  >
                    <ArtworkImage
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full aspect-video rounded-lg shadow-md"
                    />
                    <p className="mt-2.5 truncate text-sm font-bold text-white group-hover:text-[#1ED760] transition-colors">
                      {video.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[#B3B3B3]">
                      {video.channelTitle} · {video.durationLabel}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* YouTube Video & Music Suggestions */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white">
                YouTube Music &amp; Video Suggestions
              </h2>

              <div className="flex items-center gap-2 self-start">
                {(['all', 'music', 'live'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setVideoFilter(tab)}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-full capitalize transition-colors whitespace-nowrap min-h-[34px] ${
                      videoFilter === tab
                        ? 'bg-[#1ED760] text-black'
                        : 'bg-[#242424] text-white hover:bg-[#2E2E2E]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive YouTube Topic Suggestions Strip */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-1">
              {['All', ...YOUTUBE_SUGGESTED_QUERIES].map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setSelectedTopic(topic)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[34px] ${
                    selectedTopic === topic
                      ? 'bg-white text-black'
                      : 'bg-[#242424] text-[#B3B3B3] hover:text-white hover:bg-[#2E2E2E]'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>

            {suggestionsQuery.isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="rounded-xl bg-[#181818] p-3.5 space-y-3 animate-pulse"
                  >
                    <div className="aspect-video w-full rounded-lg bg-[#282828]" />
                    <div className="h-4 w-3/4 rounded bg-[#282828]" />
                    <div className="h-3 w-1/2 rounded bg-[#242424]" />
                  </div>
                ))}
              </div>
            ) : suggestedVideos.length === 0 ? (
              <div className="rounded-xl bg-[#181818] py-10 text-center text-sm text-[#B3B3B3]">
                No YouTube videos matched that filter. Try another suggestion pill above.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {suggestedVideos.slice(0, 6).map((video) => {
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
                            openYouTubeVideo(video, suggestedVideos, 'video')
                          }
                          aria-label={`Play ${video.title}`}
                          className="relative block w-full overflow-hidden rounded-lg text-left"
                        >
                          <ArtworkImage
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="aspect-video w-full rounded-lg transition-transform group-hover:scale-105"
                          />
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
                            openYouTubeVideo(video, suggestedVideos, 'video')
                          }
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#1ED760] px-3 py-2 text-xs font-bold text-black hover:bg-[#1FDF64] transition-colors whitespace-nowrap min-h-[40px]"
                        >
                          <MonitorPlay className="w-3.5 h-3.5" />
                          <span>Watch</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            openYouTubeVideo(video, suggestedVideos, 'music')
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

          {/* Trending YouTube Discoveries */}
          {trendingVideos.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Video className="w-5 h-5 text-[#1ED760]" />
                <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white">
                  Trending YouTube Discoveries
                </h2>
              </div>
              <div className="rounded-xl bg-[#181818]/60 divide-y divide-white/[0.06]">
                {trendingVideos.map((video, idx) => (
                  <div
                    key={video.videoId}
                    className="flex items-center gap-3 p-3 hover:bg-white/[0.05] transition-colors"
                  >
                    <span className="w-5 text-center text-xs font-mono-tabular text-[#B3B3B3] shrink-0">
                      {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        openYouTubeVideo(video, featuredVideos, 'video')
                      }
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <ArtworkImage
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-16 h-10 rounded object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {video.title}
                        </p>
                        <p className="truncate text-xs text-[#B3B3B3]">
                          {video.channelTitle} · {video.durationLabel}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        openYouTubeVideo(video, featuredVideos, 'video')
                      }
                      aria-label={`Play trending video ${video.title}`}
                      className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full text-[#1ED760] hover:bg-[#1ED760]/15 transition-colors shrink-0"
                    >
                      <Play className="w-4 h-4 fill-[#1ED760]" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <AddToYouTubePlaylistModal
        video={playlistModalVideo}
        onClose={() => setPlaylistModalVideo(null)}
      />
    </div>
  );
};
