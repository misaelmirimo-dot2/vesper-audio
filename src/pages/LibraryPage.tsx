import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileAudio,
  FileVideo,
  Heart,
  ListMusic,
  Play,
  Plus,
  Trash2,
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext.tsx';
import { usePlayerStore } from '../store/usePlayerStore.ts';
import type { NormalizedTrack } from '../types/music.ts';
import { localMediaToNormalizedTrack } from '../utils/localMedia.ts';
import { formatBytes, formatDuration } from '../utils/playerLogic.ts';
import { ArtworkImage } from '../components/ArtworkImage.tsx';
import { TrackRow } from '../components/TrackRow.tsx';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal.tsx';

export const LibraryPage: React.FC = () => {
  const {
    favorites,
    history,
    savedCollections,
    playlists,
    downloads,
    localMedia,
    youtubeFavorites,
    youtubePlaylists,
    removeLocalMedia,
    recordPlay,
  } = useLibrary();
  const { playTrack } = usePlayerStore();
  const [tab, setTab] = useState<
    | 'favorites'
    | 'history'
    | 'albums'
    | 'artists'
    | 'playlists'
    | 'downloads'
    | 'local'
    | 'youtube'
  >('favorites');
  const [modalTrack, setModalTrack] = useState<NormalizedTrack | null>(null);

  const savedAlbums = savedCollections.filter(
    (c) => c.collectionType === 'album'
  );
  const savedArtists = savedCollections.filter(
    (c) => c.collectionType === 'artist'
  );
  const completedDownloads = downloads.filter((d) => d.status === 'completed');
  const localAudioQueue = localMedia
    .filter((m) => m.mediaType === 'audio')
    .map(localMediaToNormalizedTrack);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            Your Library
          </h1>
          <p className="mt-1 text-sm text-[#B3B3B3]">
            Favorites, history, saved YouTube items, local offline files, and playlists.
          </p>
        </div>
        <Link
          to="/playlists"
          aria-label="Create playlist"
          className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full bg-[#242424] text-white hover:bg-[#2E2E2E] shrink-0"
        >
          <Plus className="w-5 h-5" />
        </Link>
      </div>

      {/* Horizontal Scrollable Spotify Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {(
          [
            ['favorites', `Favorites (${favorites.length})`],
            ['history', `History (${history.length})`],
            ['playlists', `Playlists (${playlists.length})`],
            ['albums', `Albums (${savedAlbums.length})`],
            ['artists', `Artists (${savedArtists.length})`],
            ['downloads', `Downloaded (${completedDownloads.length})`],
            ['local', `Local (${localMedia.length})`],
            [
              'youtube',
              `YouTube (${youtubeFavorites.length + youtubePlaylists.length})`,
            ],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[36px] ${
              tab === key
                ? 'bg-[#1ED760] text-black'
                : 'bg-[#242424] text-white hover:bg-[#2E2E2E]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'favorites' && (
        <section className="rounded-xl bg-[#181818]/60 p-1 sm:p-2">
          {favorites.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#B3B3B3]">
              No favorite tracks yet. Tap the heart icon on any track to save it
              here.
            </div>
          ) : (
            favorites.map((t, idx) => (
              <TrackRow
                key={t.id}
                track={t}
                index={idx}
                queueContext={favorites}
                onRequestAddToPlaylist={setModalTrack}
              />
            ))
          )}
        </section>
      )}

      {tab === 'history' && (
        <section className="rounded-xl bg-[#181818]/60 p-1 sm:p-2">
          {history.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#B3B3B3]">
              Your listening history will appear here once you play a track.
            </div>
          ) : (
            history.map((h, idx) => (
              <TrackRow
                key={`${h.trackId}-${h.playedAt}`}
                track={h.track}
                index={idx}
                queueContext={history.map((x) => x.track)}
                onRequestAddToPlaylist={setModalTrack}
              />
            ))
          )}
        </section>
      )}

      {tab === 'albums' && (
        <section>
          {savedAlbums.length === 0 ? (
            <div className="rounded-2xl bg-[#181818] p-10 text-center text-sm text-[#B3B3B3]">
              No saved albums yet. Open an album page to bookmark it.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {savedAlbums.map((alb) => (
                <Link
                  key={alb.key}
                  to={`/album/${alb.providerId}`}
                  className="rounded-xl bg-[#181818] hover:bg-[#242424] p-3.5 transition-colors"
                >
                  <ArtworkImage
                    src={alb.artworkUrl}
                    alt={alb.name}
                    className="w-full aspect-square rounded-lg shadow-md"
                  />
                  <p className="mt-2.5 truncate text-sm font-bold text-white">
                    {alb.name}
                  </p>
                  <p className="truncate text-xs text-[#B3B3B3] mt-0.5">
                    {alb.subtitle}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'artists' && (
        <section>
          {savedArtists.length === 0 ? (
            <div className="rounded-2xl bg-[#181818] p-10 text-center text-sm text-[#B3B3B3]">
              No saved artists yet. Open an artist profile to follow them here.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {savedArtists.map((art) => (
                <Link
                  key={art.key}
                  to={`/artist/${art.providerId}`}
                  className="rounded-xl bg-[#181818] hover:bg-[#242424] p-4 transition-colors text-center"
                >
                  <ArtworkImage
                    src={art.artworkUrl}
                    alt={art.name}
                    className="w-24 h-24 rounded-full mx-auto shadow-md"
                  />
                  <p className="mt-3 truncate text-sm font-bold text-white">
                    {art.name}
                  </p>
                  <p className="text-xs text-[#B3B3B3] mt-0.5">{art.subtitle}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'playlists' && (
        <section>
          {playlists.length === 0 ? (
            <div className="rounded-2xl bg-[#181818] p-10 text-center space-y-3">
              <p className="text-sm text-[#B3B3B3]">No playlists created yet.</p>
              <Link
                to="/playlists"
                className="inline-flex rounded-full bg-[#1ED760] px-5 py-2.5 text-xs font-bold text-black"
              >
                Create Playlist
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {playlists.map((pl) => (
                <Link
                  key={pl.id}
                  to={`/playlists/${pl.id}`}
                  className="flex items-center gap-4 rounded-xl bg-[#181818] hover:bg-[#242424] p-3.5 transition-colors"
                >
                  <ArtworkImage
                    src={pl.artworkUrl || pl.tracks[0]?.artworkUrl}
                    alt={pl.name}
                    className="w-16 h-16 rounded-md shadow-md"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">
                      {pl.name}
                    </p>
                    <p className="text-xs text-[#B3B3B3] mt-0.5">
                      Playlist · {pl.tracks.length} tracks
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'downloads' && (
        <section className="rounded-xl bg-[#181818]/60 p-1 sm:p-2">
          {completedDownloads.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#B3B3B3]">
              No tracks downloaded offline yet. Link your Downloads folder or
              import downloaded files in Offline Downloads.
            </div>
          ) : (
            completedDownloads.map((d, idx) => (
              <TrackRow
                key={d.trackId}
                track={d.track}
                index={idx}
                queueContext={completedDownloads.map((x) => x.track)}
                onRequestAddToPlaylist={setModalTrack}
              />
            ))
          )}
        </section>
      )}

      {tab === 'local' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-[#B3B3B3]">
              Audio &amp; video files imported directly from your device.
            </p>
            <Link
              to="/downloads"
              className="text-xs font-bold text-[#1ED760] hover:underline whitespace-nowrap"
            >
              Manage &amp; Import →
            </Link>
          </div>
          {localMedia.length === 0 ? (
            <div className="rounded-2xl bg-[#181818] p-10 text-center space-y-3">
              <p className="text-sm text-[#B3B3B3]">
                No local audio or video files imported yet.
              </p>
              <Link
                to="/downloads"
                className="inline-flex rounded-full bg-[#1ED760] px-5 py-2.5 text-xs font-bold text-black"
              >
                Import Local Files
              </Link>
            </div>
          ) : (
            <div className="rounded-xl bg-[#181818] divide-y divide-white/[0.06]">
              {localMedia.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3.5 p-3.5 hover:bg-white/[0.05] transition-colors"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#1ED760]/15 text-[#1ED760]">
                    {item.mediaType === 'video' ? (
                      <FileVideo className="w-5 h-5" />
                    ) : (
                      <FileAudio className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {item.title}
                    </p>
                    <p className="truncate text-xs text-[#B3B3B3] mt-0.5">
                      {item.artist} · {item.mediaType.toUpperCase()} ·{' '}
                      {formatBytes(item.fileSizeBytes)}
                      {item.duration > 0
                        ? ` · ${formatDuration(item.duration)}`
                        : ''}
                    </p>
                  </div>
                  {item.mediaType === 'audio' ? (
                    <button
                      type="button"
                      onClick={() => {
                        const t = localMediaToNormalizedTrack(item);
                        void playTrack(t, localAudioQueue);
                        void recordPlay(t);
                      }}
                      aria-label={`Play local audio ${item.title}`}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[#1ED760] hover:bg-[#1ED760]/15 transition-colors"
                    >
                      <Play className="w-5 h-5 fill-[#1ED760]" />
                    </button>
                  ) : (
                    <Link
                      to="/downloads"
                      className="rounded-full bg-[#242424] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#303030] whitespace-nowrap"
                    >
                      Watch
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => void removeLocalMedia(item.id)}
                    aria-label={`Delete local file ${item.title}`}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[#B3B3B3] hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'youtube' && (
        <section className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-white inline-flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#1ED760]" />
                Saved YouTube Favorites ({youtubeFavorites.length})
              </h2>
              <Link
                to="/youtube?tab=favorites"
                className="text-xs font-bold text-[#1ED760] hover:underline whitespace-nowrap"
              >
                Open in YouTube →
              </Link>
            </div>
            {youtubeFavorites.length === 0 ? (
              <div className="rounded-2xl bg-[#181818] p-6 text-center text-xs text-[#B3B3B3]">
                No saved YouTube favorites yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {youtubeFavorites.map((video) => (
                  <Link
                    key={video.videoId}
                    to={`/youtube?tab=favorites&q=${encodeURIComponent(video.title)}`}
                    className="rounded-xl bg-[#181818] hover:bg-[#242424] p-3.5 transition-colors"
                  >
                    <ArtworkImage
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="aspect-video w-full rounded-lg shadow-md"
                    />
                    <p className="mt-3 truncate text-sm font-bold text-white">
                      {video.title}
                    </p>
                    <p className="truncate text-xs text-[#B3B3B3] mt-0.5">
                      {video.channelTitle} · {video.durationLabel}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-white inline-flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-[#1ED760]" />
                YouTube Playlists ({youtubePlaylists.length})
              </h2>
              <Link
                to="/youtube?tab=playlists"
                className="text-xs font-bold text-[#1ED760] hover:underline whitespace-nowrap"
              >
                Manage Playlists →
              </Link>
            </div>
            {youtubePlaylists.length === 0 ? (
              <div className="rounded-2xl bg-[#181818] p-6 text-center text-xs text-[#B3B3B3]">
                No YouTube playlists created yet.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {youtubePlaylists.map((pl) => (
                  <Link
                    key={pl.id}
                    to="/youtube?tab=playlists"
                    className="rounded-xl bg-[#181818] hover:bg-[#242424] p-4 transition-colors"
                  >
                    <p className="truncate text-sm font-bold text-white">
                      {pl.name}
                    </p>
                    <p className="mt-1 text-xs text-[#B3B3B3]">
                      {pl.videos.length}{' '}
                      {pl.videos.length === 1 ? 'video' : 'videos'}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <AddToPlaylistModal
        track={modalTrack}
        onClose={() => setModalTrack(null)}
      />
    </div>
  );
};
