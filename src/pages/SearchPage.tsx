import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Clock, Search as SearchIcon, WifiOff } from 'lucide-react';
import { apiFetch, type SearchResponse } from '../lib/api.ts';
import { useLibrary } from '../context/LibraryContext.tsx';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';
import type { NormalizedTrack } from '../types/music.ts';
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
      <div className="rounded-2xl border border-[#262632] bg-[#15151B] p-8 text-center space-y-3">
        <WifiOff className="w-8 h-8 text-amber-400 mx-auto" />
        <h1 className="font-display text-xl font-semibold text-[#F5F5F7]">
          Search requires an internet connection
        </h1>
        <p className="text-sm text-[#9494A3] max-w-md mx-auto">
          Online Jamendo catalog search is unavailable while offline. Open your
          Downloads or Library to listen to cached tracks.
        </p>
        <div className="pt-2">
          <Link
            to="/downloads"
            className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-xs font-medium text-white hover:bg-sky-500"
          >
            Go to Offline Downloads
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#F5F5F7]">
            Search Catalog
          </h1>
          <p className="mt-1 text-sm text-[#9494A3]">
            Discover Creative Commons songs, independent artists, albums, and genres.
          </p>
        </div>
        <Link
          to={
            inputValue.trim()
              ? `/youtube?q=${encodeURIComponent(inputValue.trim())}`
              : '/youtube'
          }
          className="text-xs font-medium text-sky-400 hover:text-sky-300 whitespace-nowrap self-start sm:self-auto"
        >
          Search YouTube instead →
        </Link>
      </div>

      {/* Search Input */}
      <div className="relative max-w-2xl">
        <SearchIcon className="w-4 h-4 text-[#9494A3] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <label htmlFor="global-search-input" className="sr-only">
          Search Jamendo catalog
        </label>
        <input
          id="global-search-input"
          type="search"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Search tracks, artists, albums, or tags..."
          className="w-full rounded-xl border border-[#2A2A38] bg-[#15151B] pl-11 pr-4 py-3 text-sm text-[#F5F5F7] placeholder:text-[#666678] focus:border-sky-500 focus:outline-none"
        />
      </div>

      {/* Recent Searches & Suggestions */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {recentSearches.length > 0 && (
          <span className="inline-flex items-center gap-1 text-[#9494A3] mr-1">
            <Clock className="w-3.5 h-3.5" />
            Recent:
          </span>
        )}
        {recentSearches.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setInputValue(item)}
            className="rounded-md border border-[#262632] bg-[#15151B] px-2.5 py-1 text-[#D4D4DF] hover:border-sky-500/50"
          >
            {item}
          </button>
        ))}
        <span className="text-[#666678] mx-1">Suggested:</span>
        {SUGGESTED_QUERIES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setInputValue(s)}
            className="rounded-md bg-[#1A1A22] px-2.5 py-1 text-[#9494A3] hover:text-white"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-[#15151B] border border-[#22222E] w-fit">
        {(['all', 'songs', 'artists', 'albums', 'genres'] as const).map(
          (tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setCategory(tab)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                category === tab
                  ? 'bg-sky-600 text-white'
                  : 'text-[#9494A3] hover:text-white'
              }`}
            >
              {tab}
            </button>
          )
        )}
      </div>

      {/* Genres Grid when genres tab is active or genre filter is shown */}
      {(category === 'genres' || selectedGenre) && genresData && (
        <div className="flex flex-wrap gap-2">
          {genresData.genres.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => handleSelectGenre(g)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
                selectedGenre === g
                  ? 'border-sky-500 bg-sky-500/15 text-sky-300'
                  : 'border-[#262632] bg-[#15151B] text-[#9494A3] hover:text-white'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2" aria-busy="true">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-14 rounded-lg bg-[#15151B] border border-[#22222E] animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="rounded-xl border border-rose-500/30 bg-[#1B1317] p-5 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-rose-200">
            <AlertCircle className="w-5 h-5 text-rose-400" />
            <span>Search request failed. Please try again.</span>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-lg border border-rose-400/30 px-3 py-1.5 text-xs text-rose-100"
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
                <h2 className="text-base font-semibold text-[#F5F5F7]">
                  Songs ({data.tracks.length})
                </h2>
              </div>
              {data.tracks.length === 0 ? (
                <div className="rounded-xl border border-[#22222E] bg-[#15151B] p-8 text-center text-sm text-[#9494A3]">
                  No matching tracks found. Try a different keyword or clear the genre filter.
                </div>
              ) : (
                <div className="rounded-xl border border-[#22222E] bg-[#15151B] p-2">
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

              {/* Pagination */}
              {(offset > 0 || data.hasMore) && (
                <div className="mt-4 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - 12))}
                    className="rounded-lg border border-[#262632] bg-[#15151B] px-4 py-2 text-xs font-medium text-[#F5F5F7] disabled:opacity-40"
                  >
                    Previous Page
                  </button>
                  <button
                    type="button"
                    disabled={!data.hasMore}
                    onClick={() => setOffset(offset + 12)}
                    className="rounded-lg border border-[#262632] bg-[#15151B] px-4 py-2 text-xs font-medium text-[#F5F5F7] disabled:opacity-40"
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
                <h2 className="text-base font-semibold text-[#F5F5F7] mb-3">
                  Artists ({data.artists.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {data.artists.map((artist) => (
                    <Link
                      key={artist.id}
                      to={`/artist/${artist.id}`}
                      className="rounded-xl border border-[#22222E] bg-[#15151B] p-4 hover:border-[#343446] transition-colors text-center"
                    >
                      <ArtworkImage
                        src={artist.imageUrl}
                        alt={artist.name}
                        className="w-20 h-20 rounded-full mx-auto"
                      />
                      <p className="mt-3 truncate text-sm font-semibold text-[#F5F5F7]">
                        {artist.name}
                      </p>
                      <p className="mt-0.5 text-xs text-[#9494A3]">
                        {artist.genre || 'Independent Artist'}
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
                <h2 className="text-base font-semibold text-[#F5F5F7] mb-3">
                  Albums ({data.albums.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {data.albums.map((album) => (
                    <Link
                      key={album.id}
                      to={`/album/${album.id}`}
                      className="rounded-xl border border-[#22222E] bg-[#15151B] p-3.5 hover:border-[#343446] transition-colors"
                    >
                      <ArtworkImage
                        src={album.artworkUrl}
                        alt={album.name}
                        className="w-full aspect-square rounded-lg"
                      />
                      <p className="mt-2.5 truncate text-sm font-semibold text-[#F5F5F7]">
                        {album.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[#9494A3]">
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
