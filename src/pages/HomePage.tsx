import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Disc3,
  Play,
  RefreshCw,
  Search,
  WifiOff,
} from 'lucide-react';
import { apiFetch, type DiscoverResponse } from '../lib/api.ts';
import { useLibrary } from '../context/LibraryContext.tsx';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';
import { usePlayerStore } from '../store/usePlayerStore.ts';
import type { NormalizedTrack } from '../types/music.ts';
import { ArtworkImage } from '../components/ArtworkImage.tsx';
import { TrackRow } from '../components/TrackRow.tsx';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal.tsx';

export const HomePage: React.FC<{ mode?: 'home' | 'discover' }> = ({
  mode = 'home',
}) => {
  const navigate = useNavigate();
  const { commercialUseMode, simulatedOffline, history, downloads, recordPlay } =
    useLibrary();
  const isOnline = useOnlineStatus(simulatedOffline);
  const { playTrack } = usePlayerStore();

  const [quickQuery, setQuickQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [vocalFilter, setVocalFilter] = useState<
    'all' | 'instrumental' | 'vocal'
  >('all');
  const [modalTrack, setModalTrack] = useState<NormalizedTrack | null>(null);

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
        <section className="rounded-2xl border border-[#262632] bg-[#15151B] p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-medium text-amber-300">
            <WifiOff className="w-4 h-4" />
            <span>Offline Listening Mode</span>
          </div>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-[#F5F5F7]">
            Your offline music library
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#9494A3]">
            Online Jamendo discovery is unavailable without an internet
            connection. Browse and play your authorized offline downloads and
            saved playlists below.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-[#F5F5F7] mb-3">
            Downloaded Tracks ({completedDownloads.length})
          </h2>
          {completedDownloads.length === 0 ? (
            <div className="rounded-xl border border-[#262632] bg-[#15151B] p-8 text-center">
              <p className="text-sm text-[#9494A3]">
                No tracks cached offline yet. Connect to the internet to download
                permitted Creative Commons tracks.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-[#262632] bg-[#15151B] p-2">
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

  return (
    <div className="space-y-10">
      {/* Hero Banner & Global Search */}
      <section className="relative overflow-hidden rounded-2xl border border-[#262632] bg-[#15151B]">
        <div className="grid lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between gap-6">
            <div>
              <p className="text-xs font-medium text-violet-400">
                {mode === 'discover'
                  ? 'Curated Independent Catalog'
                  : 'Welcome back to Vesper Audio'}
              </p>
              <h1
                className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#F5F5F7]"
                style={{ textWrap: 'balance' }}
              >
                Independent soundscapes, licensed for offline listening.
              </h1>
              <p className="mt-3 max-w-xl text-sm text-[#9494A3] leading-relaxed">
                Stream Creative Commons releases via Jamendo v3.0 with verified
                artist attribution and licence-enforced offline caching.
              </p>
            </div>

            <div className="space-y-4">
              <form
                onSubmit={handleQuickSearch}
                className="flex flex-col sm:flex-row gap-2.5 max-w-xl"
              >
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#9494A3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <label htmlFor="home-search" className="sr-only">
                    Search songs, artists, albums, or genres
                  </label>
                  <input
                    id="home-search"
                    type="search"
                    value={quickQuery}
                    onChange={(e) => setQuickQuery(e.target.value)}
                    placeholder="Search tracks, artists, albums, or tags..."
                    className="w-full rounded-lg border border-[#2A2A38] bg-[#0E0E12] pl-10 pr-4 py-2.5 text-sm text-[#F5F5F7] placeholder:text-[#666678] focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500 transition-colors whitespace-nowrap shrink-0"
                >
                  Search
                </button>
              </form>

              {heroTrack && (
                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      void playTrack(heroTrack, data?.featured);
                      void recordPlay(heroTrack);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#F5F5F7] px-4 py-2 text-xs font-semibold text-[#0E0E12] hover:bg-white transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-[#0E0E12]" />
                    <span>Play Featured: {heroTrack.title}</span>
                  </button>
                  <span className="text-xs text-[#9494A3]">
                    {heroTrack.artistName} · {heroTrack.licenseType}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[220px] lg:min-h-[300px]">
            <img
              src="/covers/hero_indie_studio.jpg"
              alt="Analog synthesizer and vinyl listening studio"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b lg:bg-gradient-to-r from-[#15151B] via-[#15151B]/25 to-transparent" />
          </div>
        </div>
      </section>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="space-y-6" aria-busy="true" aria-label="Loading music catalog">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="rounded-xl border border-[#22222E] bg-[#15151B] p-4 animate-pulse space-y-3"
              >
                <div className="w-full aspect-square rounded-lg bg-[#22222E]" />
                <div className="h-4 w-3/4 rounded bg-[#22222E]" />
                <div className="h-3 w-1/2 rounded bg-[#1E1E28]" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="rounded-xl border border-rose-500/30 bg-[#1B1317] p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-rose-200">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>Unable to load discovery tracks from the server.</span>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/30 px-3.5 py-2 text-xs font-medium text-rose-100 hover:bg-rose-500/10"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {data && (
        <>
          {/* Featured Releases */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold text-[#F5F5F7]">
                Featured Releases
              </h2>
              <Link
                to="/search"
                className="text-xs font-medium text-violet-400 hover:text-violet-300"
              >
                Explore all
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {data.featured.map((track) => (
                <div
                  key={track.id}
                  className="group rounded-xl border border-[#22222E] bg-[#15151B] p-3.5 hover:border-[#343446] transition-colors"
                >
                  <div className="relative">
                    <ArtworkImage
                      src={track.artworkUrl}
                      alt={track.title}
                      className="w-full aspect-square rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void playTrack(track, data.featured);
                        void recordPlay(track);
                      }}
                      aria-label={`Play ${track.title}`}
                      className="absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-lg opacity-95 group-hover:scale-105 transition-transform"
                    >
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </button>
                  </div>
                  <Link
                    to={`/track/${track.id}`}
                    className="mt-3 block truncate text-sm font-semibold text-[#F5F5F7] hover:underline underline-offset-4"
                  >
                    {track.title}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-[#9494A3]">
                    {track.artistName} · {track.genre}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Filterable Popular / Instrumental / Vocal Tracks */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h2 className="font-display text-xl font-semibold text-[#F5F5F7]">
                Popular Independent Music
              </h2>

              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#15151B] border border-[#22222E] self-start">
                {(['all', 'instrumental', 'vocal'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setVocalFilter(tab)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap ${
                      vocalFilter === tab
                        ? 'bg-violet-600 text-white'
                        : 'text-[#9494A3] hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Genre interactive filter strip */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-2">
              {['All', ...data.genres].map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setSelectedGenre(genre)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                    selectedGenre === genre
                      ? 'border-violet-500 bg-violet-500/15 text-violet-300'
                      : 'border-[#262632] bg-[#15151B] text-[#9494A3] hover:text-white'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-[#22222E] bg-[#15151B] p-2">
              {genreFilteredTracks.length === 0 ? (
                <div className="py-10 text-center text-sm text-[#9494A3]">
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

          {/* Recommended Albums */}
          <section>
            <h2 className="font-display text-xl font-semibold text-[#F5F5F7] mb-4">
              Recommended Albums
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {data.albums.map((album) => (
                <Link
                  key={album.id}
                  to={`/album/${album.id}`}
                  className="group rounded-xl border border-[#22222E] bg-[#15151B] p-3 hover:border-[#343446] transition-colors"
                >
                  <ArtworkImage
                    src={album.artworkUrl}
                    alt={album.name}
                    className="w-full aspect-square rounded-lg"
                  />
                  <p className="mt-2.5 truncate text-sm font-medium text-[#F5F5F7] group-hover:text-violet-300">
                    {album.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-[#9494A3]">
                    {album.artistName}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {/* Recently Played */}
          {history.length > 0 && (
            <section>
              <h2 className="font-display text-xl font-semibold text-[#F5F5F7] mb-4">
                Recently Played
              </h2>
              <div className="rounded-xl border border-[#22222E] bg-[#15151B] p-2">
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
            <div className="flex items-center gap-2 mb-4">
              <Disc3 className="w-4 h-4 text-violet-400" />
              <h2 className="font-display text-xl font-semibold text-[#F5F5F7]">
                Trending &amp; New Discoveries
              </h2>
            </div>
            <div className="rounded-xl border border-[#22222E] bg-[#15151B] p-2">
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
