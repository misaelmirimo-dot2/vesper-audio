import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Disc3,
  Download,
  Heart,
  Play,
  RefreshCw,
  Search,
  Video,
  WifiOff,
} from 'lucide-react';
import { apiFetch, type DiscoverResponse } from '../lib/api.ts';
import { useLibrary } from '../context/LibraryContext.tsx';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';
import { usePlayerStore } from '../store/usePlayerStore.ts';
import type { NormalizedTrack } from '../types/music.ts';
import { getGreetingForHour } from '../utils/spotifyTheme.ts';
import { ArtworkImage } from '../components/ArtworkImage.tsx';
import { TrackRow } from '../components/TrackRow.tsx';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal.tsx';

export const HomePage: React.FC<{ mode?: 'home' | 'discover' }> = ({
  mode = 'home',
}) => {
  const navigate = useNavigate();
  const {
    commercialUseMode,
    simulatedOffline,
    history,
    downloads,
    favorites,
    recordPlay,
  } = useLibrary();
  const isOnline = useOnlineStatus(simulatedOffline);
  const { playTrack } = usePlayerStore();

  const [quickQuery, setQuickQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [vocalFilter, setVocalFilter] = useState<
    'all' | 'instrumental' | 'vocal'
  >('all');
  const [modalTrack, setModalTrack] = useState<NormalizedTrack | null>(null);

  const greeting = useMemo(
    () =>
      mode === 'discover'
        ? 'Discover New Music'
        : getGreetingForHour(new Date().getHours()),
    [mode]
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['discover', commercialUseMode],
    queryFn: () =>
      apiFetch<DiscoverResponse>(
        `/api/music/discover?commercialMode=${commercialUseMode}`
      ),
    enabled: isOnline,
    staleTime: 60_000,
  });

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = quickQuery.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
    } else {
      navigate('/search');
    }
  };

  if (!isOnline) {
    const completedDownloads = downloads.filter(
      (d) => d.status === 'completed'
    );
    return (
      <div className="space-y-8">
        <section className="rounded-2xl bg-gradient-to-b from-[#1A3525] to-[#181818] p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1ED760]">
            <WifiOff className="w-4 h-4" />
            <span>Offline Listening Mode</span>
          </div>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold text-white">
            Your offline music library
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#B3B3B3]">
            Online discovery is paused while offline. Stream your cached offline
            tracks, local media files, and saved playlists below.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-white mb-3">
            Downloaded Tracks ({completedDownloads.length})
          </h2>
          {completedDownloads.length === 0 ? (
            <div className="rounded-2xl bg-[#181818] p-8 text-center">
              <p className="text-sm text-[#B3B3B3]">
                No tracks cached offline yet. Connect to the internet to download
                permitted Creative Commons tracks.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {completedDownloads.map((d, i) => (
                <TrackRow
                  key={d.trackId}
                  track={d.track}
                  index={i}
                  queueContext={completedDownloads.map((x) => x.track)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  const allTracks = data
    ? vocalFilter === 'instrumental'
      ? data.instrumental
      : vocalFilter === 'vocal'
      ? data.vocal
      : data.popular
    : [];

  const genreFilteredTracks =
    selectedGenre === 'All'
      ? allTracks
      : allTracks.filter(
          (t) => t.genre.toLowerCase() === selectedGenre.toLowerCase()
        );

  const heroTrack = data?.featured[0];
  const quickPickTracks = data?.featured.slice(0, 4) || [];

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
            Music
          </Link>
          <Link
            to="/youtube"
            className="px-4 py-1.5 rounded-full text-xs font-semibold bg-[#2A2A2A] text-white hover:bg-[#343434] whitespace-nowrap shrink-0 transition-colors min-h-[34px] inline-flex items-center gap-1.5"
          >
            <Video className="w-3.5 h-3.5 text-[#1ED760]" />
            YouTube
          </Link>
          <Link
            to="/downloads"
            className="px-4 py-1.5 rounded-full text-xs font-semibold bg-[#2A2A2A] text-white hover:bg-[#343434] whitespace-nowrap shrink-0 transition-colors min-h-[34px] inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-[#1ED760]" />
            Offline
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
              Independent Creative Commons releases, YouTube sessions, and your offline locker.
            </p>
          </div>

          <form
            onSubmit={handleQuickSearch}
            className="hidden md:flex items-center gap-2 md:w-[360px] lg:w-[400px] shrink-0"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#B3B3B3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <label htmlFor="home-search" className="sr-only">
                Search songs, artists, albums, or genres
              </label>
              <input
                id="home-search"
                type="search"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                placeholder="What do you want to play?"
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

        {/* Spotify iOS 2-Column Compact Quick-Pick Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          <Link
            to="/library"
            className="group flex items-center gap-3 rounded-md bg-white/[0.1] hover:bg-white/[0.18] active:scale-[0.98] transition-all overflow-hidden h-14 sm:h-16"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center bg-gradient-to-br from-[#450AF5] to-[#C4EFD9]">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
            <div className="min-w-0 pr-2">
              <p className="truncate text-xs sm:text-sm font-bold text-white">
                Liked Songs
              </p>
              <p className="text-[11px] text-[#B3B3B3] truncate">
                {favorites.length} saved
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
                Offline Locker
              </p>
              <p className="text-[11px] text-[#B3B3B3] truncate">
                Local &amp; cached
              </p>
            </div>
          </Link>

          {quickPickTracks.map((track) => (
            <button
              key={track.id}
              type="button"
              onClick={() => {
                void playTrack(track, data?.featured);
                void recordPlay(track);
              }}
              className="group flex items-center gap-3 rounded-md bg-white/[0.1] hover:bg-white/[0.18] active:scale-[0.98] transition-all overflow-hidden h-14 sm:h-16 text-left"
            >
              <ArtworkImage
                src={track.artworkUrl}
                alt={track.title}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-none shrink-0"
              />
              <div className="min-w-0 flex-1 pr-2">
                <p className="line-clamp-2 text-xs sm:text-sm font-bold text-white leading-tight">
                  {track.title}
                </p>
              </div>
              <span className="hidden sm:flex mr-3 w-8 h-8 rounded-full bg-[#1ED760] text-black items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg shrink-0">
                <Play className="w-4 h-4 fill-black ml-0.5" />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Desktop Spotlight Hero Card (subtle Spotify Artist/Featured Spotlight) */}
      {heroTrack && (
        <section className="hidden lg:grid lg:grid-cols-12 rounded-2xl overflow-hidden bg-gradient-to-r from-[#181818] via-[#1C2A21] to-[#181818] border border-white/[0.06]">
          <div className="lg:col-span-7 p-8 flex flex-col justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#1ED760]">
                Featured Release
              </p>
              <h2
                className="mt-2 font-display text-3xl font-extrabold text-white"
                style={{ textWrap: 'balance' }}
              >
                {heroTrack.title}
              </h2>
              <p className="mt-2 text-sm text-[#B3B3B3]">
                {heroTrack.artistName} · {heroTrack.albumName} · {heroTrack.licenseType}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  void playTrack(heroTrack, data?.featured);
                  void recordPlay(heroTrack);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[#1ED760] px-6 py-3 text-sm font-bold text-black hover:bg-[#1FDF64] hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>Play Now</span>
              </button>
              <Link
                to={`/track/${heroTrack.id}`}
                className="inline-flex items-center rounded-full border border-white/25 px-5 py-3 text-xs font-bold text-white hover:border-white transition-colors"
              >
                View Credits
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5 relative min-h-[220px]">
            <img
              src="/covers/hero_indie_studio.jpg"
              alt="Analog synthesizer and vinyl listening studio"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1C2A21] via-transparent to-transparent" />
          </div>
        </section>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="space-y-6" aria-busy="true" aria-label="Loading music catalog">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="rounded-xl bg-[#181818] p-3 animate-pulse space-y-3"
              >
                <div className="w-full aspect-square rounded-lg bg-[#282828]" />
                <div className="h-4 w-3/4 rounded bg-[#282828]" />
                <div className="h-3 w-1/2 rounded bg-[#242424]" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="rounded-xl bg-[#2A181B] border border-rose-500/30 p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-rose-200">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>Unable to load discovery tracks from the server.</span>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-black hover:scale-105 transition-transform"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {data && (
        <>
          {/* Featured Releases (Horizontal Snap Carousel on Mobile, Grid on Desktop) */}
          <section>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white">
                Featured Releases
              </h2>
              <Link
                to="/search"
                className="text-xs font-bold text-[#B3B3B3] hover:text-white"
              >
                Show all
              </Link>
            </div>
            <div className="flex gap-3.5 overflow-x-auto no-scrollbar snap-x -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 md:grid-cols-4 sm:gap-5">
              {data.featured.map((track) => (
                <div
                  key={track.id}
                  className="group w-[156px] sm:w-auto shrink-0 snap-start sm:rounded-xl sm:bg-[#181818] sm:hover:bg-[#242424] sm:p-3.5 transition-colors"
                >
                  <div className="relative">
                    <ArtworkImage
                      src={track.artworkUrl}
                      alt={track.title}
                      className="w-full aspect-square rounded-lg shadow-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void playTrack(track, data.featured);
                        void recordPlay(track);
                      }}
                      aria-label={`Play ${track.title}`}
                      className="absolute bottom-2.5 right-2.5 w-11 h-11 rounded-full bg-[#1ED760] text-black flex items-center justify-center shadow-xl sm:opacity-0 sm:translate-y-1 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 hover:scale-105 active:scale-95 transition-all"
                    >
                      <Play className="w-5 h-5 fill-black ml-0.5" />
                    </button>
                  </div>
                  <Link
                    to={`/track/${track.id}`}
                    className="mt-2.5 block truncate text-sm font-bold text-white hover:underline underline-offset-4"
                  >
                    {track.title}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-[#B3B3B3]">
                    {track.artistName} · {track.genre}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Recommended Albums (Horizontal Snap Carousel on Mobile, Grid on Desktop) */}
          <section>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white">
                Jump Back In
              </h2>
              <Link
                to="/search?category=albums"
                className="text-xs font-bold text-[#B3B3B3] hover:text-white"
              >
                Show all
              </Link>
            </div>
            <div className="flex gap-3.5 overflow-x-auto no-scrollbar snap-x -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 lg:grid-cols-6 sm:gap-4">
              {data.albums.map((album) => (
                <Link
                  key={album.id}
                  to={`/album/${album.id}`}
                  className="group w-[144px] sm:w-auto shrink-0 snap-start sm:rounded-xl sm:bg-[#181818] sm:hover:bg-[#242424] sm:p-3 transition-colors"
                >
                  <ArtworkImage
                    src={album.artworkUrl}
                    alt={album.name}
                    className="w-full aspect-square rounded-lg shadow-md"
                  />
                  <p className="mt-2.5 truncate text-sm font-bold text-white group-hover:text-[#1ED760] transition-colors">
                    {album.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-[#B3B3B3]">
                    {album.artistName}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {/* Popular Independent Music with Spotify Filter Pills */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white">
                Popular Tracks
              </h2>

              <div className="flex items-center gap-2 self-start">
                {(['all', 'instrumental', 'vocal'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setVocalFilter(tab)}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-full capitalize transition-colors whitespace-nowrap min-h-[34px] ${
                      vocalFilter === tab
                        ? 'bg-[#1ED760] text-black'
                        : 'bg-[#242424] text-white hover:bg-[#2E2E2E]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Genre interactive filter strip */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-1">
              {['All', ...data.genres].map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setSelectedGenre(genre)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[34px] ${
                    selectedGenre === genre
                      ? 'bg-white text-black'
                      : 'bg-[#242424] text-[#B3B3B3] hover:text-white hover:bg-[#2E2E2E]'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>

            <div className="rounded-xl bg-[#181818]/60 p-1 sm:p-2">
              {genreFilteredTracks.length === 0 ? (
                <div className="py-10 text-center text-sm text-[#B3B3B3]">
                  No tracks matched the selected genre and vocal filter.
                </div>
              ) : (
                genreFilteredTracks.map((track, idx) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    index={idx}
                    queueContext={genreFilteredTracks}
                    onRequestAddToPlaylist={setModalTrack}
                  />
                ))
              )}
            </div>
          </section>

          {/* Recently Played */}
          {history.length > 0 && (
            <section>
              <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white mb-3">
                Recently Played
              </h2>
              <div className="rounded-xl bg-[#181818]/60 p-1 sm:p-2">
                {history.slice(0, 5).map((item, idx) => (
                  <TrackRow
                    key={`${item.trackId}-${item.playedAt}`}
                    track={item.track}
                    index={idx}
                    queueContext={history.map((h) => h.track)}
                    onRequestAddToPlaylist={setModalTrack}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Trending / New Arrivals */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Disc3 className="w-5 h-5 text-[#1ED760]" />
              <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white">
                Trending &amp; New Discoveries
              </h2>
            </div>
            <div className="rounded-xl bg-[#181818]/60 p-1 sm:p-2">
              {data.trending.slice(0, 6).map((track, idx) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={idx}
                  queueContext={data.trending}
                  onRequestAddToPlaylist={setModalTrack}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <AddToPlaylistModal
        track={modalTrack}
        onClose={() => setModalTrack(null)}
      />
    </div>
  );
};
