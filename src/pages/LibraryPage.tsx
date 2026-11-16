import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileAudio,
  FileVideo,
  Heart,
  ListMusic,
  Play,
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
      <div>
        <h1 className="font-display text-2xl font-bold text-[#F5F5F7]">
          My Library
        </h1>
        <p className="mt-1 text-sm text-[#9494A3]">
          Personal favorites, listening history, saved YouTube items, local
          offline files, and playlists.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#15151B] border border-[#22222E] w-fit">
        {(
          [
            ['favorites', `Favorites (${favorites.length})`],
            ['history', `Recently Played (${history.length})`],
            ['albums', `Albums (${savedAlbums.length})`],
            ['artists', `Artists (${savedArtists.length})`],
            ['playlists', `Playlists (${playlists.length})`],
            ['downloads', `Downloaded (${completedDownloads.length})`],
            ['local', `Local Files (${localMedia.length})`],
            [
              'youtube',
              `YouTube Saved (${youtubeFavorites.length + youtubePlaylists.length})`,
            ],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              tab === key
                ? 'bg-violet-600 text-white'
                : 'text-[#9494A3] hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'favorites' && (
        <section className="rounded-xl border border-[#22222E] bg-[#15151B] p-2">
          {favorites.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#9494A3]">
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
        <section className="rounded-xl border border-[#22222E] bg-[#15151B] p-2">
          {history.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#9494A3]">
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
            <div className="rounded-xl border border-[#22222E] bg-[#15151B] p-8 text-center text-sm text-[#9494A3]">
              No saved albums yet. Open an album page to bookmark it.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {savedAlbums.map((alb) => (
                <Link
                  key={alb.key}
                  to={`/album/${alb.providerId}`}
                  className="rounded-xl border border-[#22222E] bg-[#15151B] p-3.5 hover:border-[#343446]"
                >
                  <ArtworkImage
                    src={alb.artworkUrl}
                    alt={alb.name}
                    className="w-full aspect-square rounded-lg"
                  />
                  <p className="mt-2.5 truncate text-sm font-medium text-[#F5F5F7]">
                    {alb.name}
                  </p>
                  <p className="truncate text-xs text-[#9494A3]">
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
            <div className="rounded-xl border border-[#22222E] bg-[#15151B] p-8 text-center text-sm text-[#9494A3]">
              No saved artists yet. Open an artist profile to follow them here.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {savedArtists.map((art) => (
                <Link
                  key={art.key}
                  to={`/artist/${art.providerId}`}
                  className="rounded-xl border border-[#22222E] bg-[#15151B] p-4 hover:border-[#343446] text-center"
                >
                  <ArtworkImage
                    src={art.artworkUrl}
                    alt={art.name}
                    className="w-20 h-20 rounded-full mx-auto"
                  />
                  <p className="mt-3 truncate text-sm font-medium text-[#F5F5F7]">
                    {art.name}
                  </p>
                  <p className="text-xs text-[#9494A3]">{art.subtitle}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'playlists' && (
        <section>
          {playlists.length === 0 ? (
            <div className="rounded-xl border border-[#22222E] bg-[#15151B] p-8 text-center space-y-3">
              <p className="text-sm text-[#9494A3]">No playlists created yet.</p>
              <Link
                to="/playlists"
                className="inline-flex rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white"
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
                  className="flex items-center gap-4 rounded-xl border border-[#22222E] bg-[#15151B] p-3.5 hover:border-[#343446]"
                >
                  <ArtworkImage
                    src={pl.artworkUrl || pl.tracks[0]?.artworkUrl}
                    alt={pl.name}
                    className="w-16 h-16 rounded-lg"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#F5F5F7]">
                      {pl.name}
                    </p>
                    <p className="text-xs text-[#9494A3]">
                      {pl.tracks.length} tracks
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'downloads' && (
        <section className="rounded-xl border border-[#22222E] bg-[#15151B] p-2">
          {completedDownloads.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#9494A3]">
              No tracks downloaded offline. Visit Discover or Search to download
              authorized tracks.
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
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-[#9494A3]">
              Audio & video files imported directly from your device.
            </p>
            <Link
              to="/downloads"
              className="text-xs font-medium text-violet-400 hover:text-violet-300 whitespace-nowrap"
            >
              Manage & Import in Locker →
            </Link>
          </div>
          {localMedia.length === 0 ? (
            <div className="rounded-xl border border-[#22222E] bg-[#15151B] p-8 text-center space-y-3">
              <p className="text-sm text-[#9494A3]">
                No local audio or video files imported yet.
              </p>
              <Link
                to="/downloads"
                className="inline-flex rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white"
              >
                Import Local Files
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-[#22222E] bg-[#15151B] divide-y divide-[#1E1E28]">
              {localMedia.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3.5 hover:bg-[#191922]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-600/15 border border-violet-500/30 text-violet-300">
                    {item.mediaType === 'video' ? (
                      <FileVideo className="w-5 h-5" />
                    ) : (
                      <FileAudio className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#F5F5F7]">
                      {item.title}
                    </p>
                    <p className="truncate text-xs text-[#9494A3]">
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
                      className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-violet-300 hover:bg-violet-500/15"
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>
                  ) : (
                    <Link
                      to="/downloads"
                      className="rounded-lg border border-[#2A2A38] px-3 py-1.5 text-xs text-[#D4D4DF] hover:border-violet-500/50 whitespace-nowrap"
                    >
                      Watch in Locker
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => void removeLocalMedia(item.id)}
                    aria-label={`Delete local file ${item.title}`}
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-[#9494A3] hover:text-rose-400"
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
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[#F5F5F7] inline-flex items-center gap-2">
                <Heart className="w-4 h-4 text-violet-400" />
                Saved YouTube Favorites ({youtubeFavorites.length})
              </h2>
              <Link
                to="/youtube?tab=favorites"
                className="text-xs font-medium text-violet-400 hover:text-violet-300 whitespace-nowrap"
              >
                Open in YouTube Player →
              </Link>
            </div>
            {youtubeFavorites.length === 0 ? (
              <div className="rounded-xl border border-[#22222E] bg-[#15151B] p-6 text-center text-xs text-[#9494A3]">
                No saved YouTube favorites yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {youtubeFavorites.map((video) => (
                  <Link
                    key={video.videoId}
                    to={`/youtube?tab=favorites&q=${encodeURIComponent(video.title)}`}
                    className="rounded-xl border border-[#22222E] bg-[#15151B] p-3 hover:border-[#343446]"
                  >
                    <ArtworkImage
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="aspect-video w-full rounded-lg"
                    />
                    <p className="mt-2.5 truncate text-sm font-medium text-[#F5F5F7]">
                      {video.title}
                    </p>
                    <p className="truncate text-xs text-[#9494A3]">
                      {video.channelTitle} · {video.durationLabel}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[#F5F5F7] inline-flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-violet-400" />
                YouTube Playlists ({youtubePlaylists.length})
              </h2>
              <Link
                to="/youtube?tab=playlists"
                className="text-xs font-medium text-violet-400 hover:text-violet-300 whitespace-nowrap"
              >
                Manage Playlists →
              </Link>
            </div>
            {youtubePlaylists.length === 0 ? (
              <div className="rounded-xl border border-[#22222E] bg-[#15151B] p-6 text-center text-xs text-[#9494A3]">
                No YouTube playlists created yet.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {youtubePlaylists.map((pl) => (
                  <Link
                    key={pl.id}
                    to="/youtube?tab=playlists"
                    className="rounded-xl border border-[#22222E] bg-[#15151B] p-4 hover:border-[#343446]"
                  >
                    <p className="truncate text-sm font-semibold text-[#F5F5F7]">
                      {pl.name}
                    </p>
                    <p className="mt-1 text-xs text-[#9494A3]">
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
