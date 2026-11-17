import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Clock,
  Disc3,
  Search as SearchIcon,
  Video,
  WifiOff,
} from 'lucide-react';
import { apiFetch, type SearchResponse } from '../lib/api.ts';
import { useLibrary } from '../context/LibraryContext.tsx';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';
import type { NormalizedTrack } from '../types/music.ts';
import { getGenreTileColor } from '../utils/spotifyTheme.ts';
import { ArtworkImage } from '../components/ArtworkImage.tsx';
import { TrackRow } from '../components/TrackRow.tsx';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal.tsx';

const SUGGESTED_QUERIES = [
  'Ambient',
  'Electronic',
  'Acoustic',
  'Lo-Fi',
  'Piano',
  'Jazz',
];

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const initialGenre = searchParams.get('genre') || '';

  const [inputValue, setInputValue] = useState(initialQ);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQ);
  const [selectedGenre, setSelectedGenre] = useState(initialGenre);
  const [category, setCategory] = useState<
    'all' | 'songs' | 'artists' | 'albums' | 'genres'
  >('all');
  const [offset, setOffset] = useState(0);
  const [modalTrack, setModalTrack] = useState<NormalizedTrack | null>(null);

  const { commercialUseMode, simulatedOffline, recentSearches, addRecentSearch } =
    useLibrary();
  const isOnline = useOnlineStatus(simulatedOffline);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(inputValue.trim());
      setOffset(0);
      if (inputValue.trim().length >= 2) {
        void addRecentSearch(inputValue.trim());
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const { data: genresData } = useQuery({
    queryKey: ['genres'],
    queryFn: () => apiFetch<{ genres: string[] }>('/api/music/genres'),
    enabled: isOnline,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [
      'search',
      debouncedQuery,
      selectedGenre,
      offset,
      commercialUseMode,
    ],
    queryFn: () => {
      const qs = new URLSearchParams({
        q: debouncedQuery,
        genre: selectedGenre,
        limit: '12',
        offset: String(offset),
        commercialMode: String(commercialUseMode),
      });
      return apiFetch<SearchResponse>(`/api/music/search?${qs.toString()}`);
    },
    enabled: isOnline,
  });

  const handleSelectGenre = (genre: string) => {
    const next = selectedGenre === genre ? '' : genre;
    setSelectedGenre(next);
    setOffset(0);
    setCategory('all');
    if (next) {
      setSearchParams({ genre: next });
    } else {
      setSearchParams({});
    }
  };

  if (!isOnline) {
    return (
      <div className="rounded-2xl bg-[#181818] p-8 text-center space-y-3">
        <WifiOff className="w-8 h-8 text-[#1ED760] mx-auto" />
        <h1 className="font-display text-xl font-bold text-white">
          Search requires an internet connection
        </h1>
        <p className="text-sm text-[#B3B3B3] max-w-md mx-auto">
          Online Jamendo catalog search is unavailable while offline. Open your
          Offline Locker to listen to cached tracks.
        </p>
        <div className="pt-2">
          <Link
            to="/downloads"
            className="inline-flex items-center rounded-full bg-[#1ED760] px-5 py-2.5 text-xs font-bold text-black hover:bg-[#1FDF64]"
          >
            Go to Offline Locker
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
            Search
          </h1>
          <p className="mt-1 text-sm text-[#B3B3B3]">
            Discover Creative Commons songs, artists, albums, and genres.
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
          <Video className="w-3.5 h-3.5 text-[#1ED760]" />
          <span>Search YouTube instead</span>
        </Link>
      </div>

      {/* Authentic High-Contrast Spotify Search Bar */}
      <div className="relative max-w-2xl">
        <SearchIcon className="w-5 h-5 text-[#121212] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <label htmlFor="global-search-input" className="sr-only">
          Search Jamendo catalog
        </label>
        <input
          id="global-search-input"
          type="search"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="What do you want to listen to?"
          className="w-full rounded-lg bg-white pl-12 pr-4 py-3 text-sm font-medium text-[#121212] placeholder:text-[#535353] focus:outline-none focus:ring-2 focus:ring-[#1ED760] min-h-[48px]"
        />
      </div>

      {/* Recent Searches & Suggestions */}
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
            onClick={() => setInputValue(item)}
            className="rounded-full bg-[#242424] px-3.5 py-1.5 font-medium text-white hover:bg-[#303030] transition-colors"
          >
            {item}
          </button>
        ))}
        <span className="text-[#727272] mx-1">Suggested:</span>
        {SUGGESTED_QUERIES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setInputValue(s)}
            className="rounded-full bg-[#1E1E1E] px-3.5 py-1.5 font-medium text-[#B3B3B3] hover:text-white hover:bg-[#2A2A2A] transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Spotify Horizontal Scroll Category Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {(['all', 'songs', 'artists', 'albums', 'genres'] as const).map(
          (tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setCategory(tab)}
              className={`px-4 py-2 rounded-full text-xs font-semibold capitalize transition-colors whitespace-nowrap shrink-0 min-h-[36px] ${
                category === tab
                  ? 'bg-[#1ED760] text-black'
                  : 'bg-[#242424] text-white hover:bg-[#2E2E2E]'
              }`}
            >
              {tab}
            </button>
          )
        )}
      </div>

      {/* Spotify Colored Browse Genre Tiles */}
      {(category === 'genres' || selectedGenre || (!debouncedQuery && category === 'all')) &&
        genresData && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-white">
                Browse All Genres
              </h2>
              {selectedGenre && (
                <button
                  type="button"
                  onClick={() => handleSelectGenre(selectedGenre)}
                  className="text-xs font-semibold text-[#1ED760] hover:underline"
                >
                  Clear filter ({selectedGenre})
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {genresData.genres.map((g, idx) => {
                const bg = getGenreTileColor(g, idx);
                const active = selectedGenre === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleSelectGenre(g)}
                    style={{ backgroundColor: bg }}
                    className={`relative overflow-hidden rounded-xl p-4 h-24 text-left transition-transform active:scale-[0.97] hover:brightness-110 ${
                      active ? 'ring-2 ring-white ring-offset-2 ring-offset-[#121212]' : ''
                    }`}
                  >
                    <span className="relative z-10 text-base font-extrabold text-white leading-tight block">
                      {g}
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
        )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2" aria-busy="true">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-14 rounded-lg bg-[#181818] animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="rounded-xl bg-[#2A181B] border border-rose-500/30 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-rose-200">
            <AlertCircle className="w-5 h-5 text-rose-400" />
            <span>Search request failed. Please try again.</span>
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

      {data && !isLoading && (
        <div className="space-y-8">
          {/* Songs */}
          {(category === 'all' || category === 'songs' || category === 'genres') && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-lg font-bold text-white">
                  Songs ({data.tracks.length})
                </h2>
              </div>
              {data.tracks.length === 0 ? (
                <div className="rounded-2xl bg-[#181818] p-8 text-center text-sm text-[#B3B3B3]">
                  No matching tracks found. Try a different keyword or clear the genre filter.
                </div>
              ) : (
                <div className="rounded-xl bg-[#181818]/60 p-1 sm:p-2">
                  {data.tracks.map((track, idx) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      index={offset + idx}
                      queueContext={data.tracks}
                      onRequestAddToPlaylist={setModalTrack}
                    />
                  ))}
                </div>
              )}

              {(offset > 0 || data.hasMore) && (
                <div className="mt-4 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - 12))}
                    className="rounded-full bg-[#242424] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#303030] disabled:opacity-40"
                  >
                    Previous Page
                  </button>
                  <button
                    type="button"
                    disabled={!data.hasMore}
                    onClick={() => setOffset(offset + 12)}
                    className="rounded-full bg-[#242424] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#303030] disabled:opacity-40"
                  >
                    Next Page
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Artists */}
          {(category === 'all' || category === 'artists') &&
            data.artists.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-bold text-white mb-3">
                  Artists ({data.artists.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {data.artists.map((artist) => (
                    <Link
                      key={artist.id}
                      to={`/artist/${artist.id}`}
                      className="rounded-xl bg-[#181818] hover:bg-[#242424] p-4 transition-colors text-center"
                    >
                      <ArtworkImage
                        src={artist.imageUrl}
                        alt={artist.name}
                        className="w-24 h-24 rounded-full mx-auto shadow-lg"
                      />
                      <p className="mt-3 truncate text-sm font-bold text-white">
                        {artist.name}
                      </p>
                      <p className="mt-0.5 text-xs text-[#B3B3B3]">
                        {artist.genre || 'Artist'}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

          {/* Albums */}
          {(category === 'all' || category === 'albums') &&
            data.albums.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-bold text-white mb-3">
                  Albums ({data.albums.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {data.albums.map((album) => (
                    <Link
                      key={album.id}
                      to={`/album/${album.id}`}
                      className="rounded-xl bg-[#181818] hover:bg-[#242424] p-3.5 transition-colors"
                    >
                      <ArtworkImage
                        src={album.artworkUrl}
                        alt={album.name}
                        className="w-full aspect-square rounded-lg shadow-md"
                      />
                      <p className="mt-2.5 truncate text-sm font-bold text-white">
                        {album.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[#B3B3B3]">
                        {album.artistName}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
        </div>
      )}

      <AddToPlaylistModal
        track={modalTrack}
        onClose={() => setModalTrack(null)}
      />
    </div>
  );
};
