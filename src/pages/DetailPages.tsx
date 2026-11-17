import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bookmark,
  CheckCircle2,
  Download,
  ExternalLink,
  Heart,
  Lock,
  Play,
  ShieldCheck,
} from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import { useLibrary } from '../context/LibraryContext.tsx';
import { usePlayerStore } from '../store/usePlayerStore.ts';
import type {
  NormalizedAlbum,
  NormalizedArtist,
  NormalizedTrack,
} from '../types/music.ts';
import { formatDuration } from '../utils/playerLogic.ts';
import { ArtworkImage } from '../components/ArtworkImage.tsx';
import { TrackRow } from '../components/TrackRow.tsx';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal.tsx';

export const TrackDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const {
    commercialUseMode,
    isFavorite,
    toggleFavorite,
    startDownload,
    getDownloadEntry,
    recordPlay,
  } = useLibrary();
  const { playTrack } = usePlayerStore();
  const [modalTrack, setModalTrack] = useState<NormalizedTrack | null>(null);
  const [dlMessage, setDlMessage] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['track', id, commercialUseMode],
    queryFn: () =>
      apiFetch<{ track: NormalizedTrack; similar: NormalizedTrack[] }>(
        `/api/music/tracks/${id}?commercialMode=${commercialUseMode}`
      ),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return <div className="h-64 rounded-2xl bg-[#181818] animate-pulse" />;
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl bg-[#181818] p-8 text-center">
        <p className="text-sm text-[#B3B3B3]">Track details could not be loaded.</p>
      </div>
    );
  }

  const { track, similar } = data;
  const favorited = isFavorite(track.id);
  const dlEntry = getDownloadEntry(track.id);
  const isDownloaded = dlEntry?.status === 'completed';
  const permitted =
    track.licenseEvaluation.offlineDownloadPermitted &&
    (!commercialUseMode || track.licenseEvaluation.commercialUsePermitted);

  const handleDownload = async () => {
    setDlMessage(null);
    try {
      await startDownload(track);
      setDlMessage('Saved to browser Cache Storage for offline listening.');
    } catch (err) {
      setDlMessage(err instanceof Error ? err.message : 'Download failed');
    }
  };

  return (
    <div className="space-y-8">
      {/* Spotify Gradient Track Hero */}
      <section className="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-6 px-4 pt-6 pb-6 sm:px-6 lg:px-8 bg-gradient-to-b from-[#2A2A2A] via-[#1B1B1B] to-[#121212] flex flex-col md:flex-row items-center md:items-end gap-6">
        <ArtworkImage
          src={track.artworkUrl}
          alt={track.title}
          className="w-48 h-48 sm:w-56 sm:h-56 rounded-lg mx-auto md:mx-0 shadow-[0_20px_50px_rgba(0,0,0,0.65)]"
        />

        <div className="flex-1 text-center md:text-left space-y-3 min-w-0">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#1ED760]">
              {track.genre} · {track.isInstrumental ? 'Instrumental' : 'Vocal'}
            </p>
            <h1 className="mt-1 font-display text-2xl sm:text-4xl font-extrabold text-white">
              {track.title}
            </h1>
            <p className="mt-2 text-sm text-[#B3B3B3]">
              <Link
                to={`/artist/${track.artistId}`}
                className="text-white font-semibold hover:underline underline-offset-4"
              >
                {track.artistName}
              </Link>
              <span className="mx-2">·</span>
              <Link
                to={`/album/${track.albumId}`}
                className="hover:text-white hover:underline underline-offset-4"
              >
                {track.albumName}
              </Link>
              <span className="mx-2">·</span>
              <span className="font-mono-tabular">
                {formatDuration(track.duration)}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                void playTrack(track, [track, ...similar]);
                void recordPlay(track);
              }}
              aria-label={`Play ${track.title}`}
              className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#1ED760] text-black hover:bg-[#1FDF64] hover:scale-105 active:scale-95 transition-all shadow-xl"
            >
              <Play className="w-6 h-6 fill-black ml-0.5" />
            </button>

            <button
              type="button"
              onClick={() => void toggleFavorite(track)}
              className="inline-flex items-center gap-2 rounded-full bg-[#242424] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#303030] min-h-[42px]"
            >
              <Heart
                className={`w-4 h-4 ${
                  favorited ? 'fill-[#1ED760] text-[#1ED760]' : ''
                }`}
              />
              <span>{favorited ? 'Liked' : 'Save'}</span>
            </button>

            {isDownloaded ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-[#1ED760]/15 px-4 py-2.5 text-xs font-bold text-[#1ED760]">
                <CheckCircle2 className="w-4 h-4" />
                Downloaded
              </span>
            ) : permitted ? (
              <button
                type="button"
                onClick={() => void handleDownload()}
                className="inline-flex items-center gap-2 rounded-full bg-[#242424] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#303030] min-h-[42px]"
              >
                <Download className="w-4 h-4 text-[#1ED760]" />
                <span>Download</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-[#242424] px-4 py-2.5 text-xs text-[#B3B3B3]">
                <Lock className="w-3.5 h-3.5" />
                Restricted
              </span>
            )}
          </div>

          {dlMessage && (
            <p className="text-xs font-medium text-[#1ED760]">{dlMessage}</p>
          )}
        </div>
      </section>

      {/* Licensing & Attribution Verification Panel */}
      <section className="rounded-2xl bg-[#181818] p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#1ED760]" />
          <h2 className="font-display text-lg font-bold text-white">
            Licensing &amp; Attribution Verification
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl bg-[#242424] p-3.5">
            <p className="text-[#B3B3B3]">Licence Type</p>
            <p className="mt-1 text-sm font-bold text-white">
              {track.licenseType}
            </p>
          </div>
          <div className="rounded-xl bg-[#242424] p-3.5">
            <p className="text-[#B3B3B3]">Download Permission</p>
            <p className="mt-1 text-sm font-bold text-white">
              {track.audiodownloadAllowed
                ? 'Permitted by Artist'
                : 'Streaming Only'}
            </p>
          </div>
          <div className="rounded-xl bg-[#242424] p-3.5">
            <p className="text-[#B3B3B3]">Commercial Use</p>
            <p className="mt-1 text-sm font-bold text-white">
              {track.licenseEvaluation.commercialUsePermitted
                ? 'Allowed with Attribution'
                : 'Non-Commercial Only'}
            </p>
          </div>
          <div className="rounded-xl bg-[#242424] p-3.5">
            <p className="text-[#B3B3B3]">Derivatives / Transcoding</p>
            <p className="mt-1 text-sm font-bold text-white">
              {track.licenseEvaluation.derivativesPermitted
                ? 'Permitted'
                : 'No Derivatives'}
            </p>
          </div>
        </div>

        {track.licenseEvaluation.blockedReason && (
          <p className="text-xs text-amber-300">
            Policy Notice: {track.licenseEvaluation.blockedReason}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-6 pt-3 text-xs text-[#B3B3B3] border-t border-white/10">
          <span>
            Artist Credit: <strong className="text-white">{track.artistName}</strong>
          </span>
          <span>Source: Jamendo Music API v3.0</span>
          <a
            href={track.originalTrackUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[#1ED760] hover:underline underline-offset-4 font-semibold"
          >
            Original Jamendo Track Page
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href={track.licenseUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-white hover:text-[#1ED760] underline underline-offset-4"
          >
            Official Licence Deed
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </section>

      {similar.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-bold text-white mb-3">
            Recommended Tracks
          </h2>
          <div className="rounded-xl bg-[#181818]/60 p-1 sm:p-2">
            {similar.map((t, idx) => (
              <TrackRow
                key={t.id}
                track={t}
                index={idx}
                queueContext={similar}
                onRequestAddToPlaylist={setModalTrack}
              />
            ))}
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

export const ArtistDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { commercialUseMode, isSavedCollection, toggleSaveCollection } =
    useLibrary();
  const [modalTrack, setModalTrack] = useState<NormalizedTrack | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['artist', id, commercialUseMode],
    queryFn: () =>
      apiFetch<{
        artist: NormalizedArtist;
        tracks: NormalizedTrack[];
        albums: NormalizedAlbum[];
      }>(`/api/music/artists/${id}?commercialMode=${commercialUseMode}`),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return <div className="h-64 rounded-2xl bg-[#181818] animate-pulse" />;
  }
  if (isError || !data) {
    return (
      <div className="rounded-2xl bg-[#181818] p-8 text-center text-sm text-[#B3B3B3]">
        Artist details unavailable.
      </div>
    );
  }

  const saved = isSavedCollection('artist', data.artist.id);

  return (
    <div className="space-y-8">
      <section className="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-6 px-4 pt-6 pb-6 sm:px-6 lg:px-8 bg-gradient-to-b from-[#2A2A2A] via-[#1B1B1B] to-[#121212] flex flex-col sm:flex-row items-center sm:items-end gap-6">
        <ArtworkImage
          src={data.artist.imageUrl}
          alt={data.artist.name}
          className="w-36 h-36 sm:w-44 sm:h-44 rounded-full shadow-2xl"
        />
        <div className="flex-1 text-center sm:text-left space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[#1ED760]">
            {data.artist.genre || 'Independent Artist'}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
            {data.artist.name}
          </h1>
          {data.artist.bio && (
            <p className="text-sm text-[#B3B3B3] max-w-2xl">{data.artist.bio}</p>
          )}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
            <button
              type="button"
              onClick={() =>
                void toggleSaveCollection({
                  collectionType: 'artist',
                  providerId: data.artist.id,
                  name: data.artist.name,
                  subtitle: data.artist.genre || 'Artist',
                  artworkUrl: data.artist.imageUrl,
                })
              }
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold transition-colors min-h-[40px] ${
                saved
                  ? 'bg-[#1ED760] text-black'
                  : 'border border-white/30 text-white hover:border-white'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-black' : ''}`} />
              <span>{saved ? 'Following' : 'Follow'}</span>
            </button>
            <a
              href={data.artist.shareUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#B3B3B3] hover:text-white underline underline-offset-4"
            >
              Jamendo Artist Page
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-bold text-white mb-3">
          Popular Tracks ({data.tracks.length})
        </h2>
        <div className="rounded-xl bg-[#181818]/60 p-1 sm:p-2">
          {data.tracks.map((track, idx) => (
            <TrackRow
              key={track.id}
              track={track}
              index={idx}
              queueContext={data.tracks}
              onRequestAddToPlaylist={setModalTrack}
            />
          ))}
        </div>
      </section>

      {data.albums.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-bold text-white mb-3">
            Discography
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {data.albums.map((alb) => (
              <Link
                key={alb.id}
                to={`/album/${alb.id}`}
                className="rounded-xl bg-[#181818] hover:bg-[#242424] p-3.5 transition-colors"
              >
                <ArtworkImage
                  src={alb.artworkUrl}
                  alt={alb.name}
                  className="w-full aspect-square rounded-lg"
                />
                <p className="mt-2.5 truncate text-sm font-bold text-white">
                  {alb.name}
                </p>
                <p className="text-xs text-[#B3B3B3]">{alb.releaseDate}</p>
              </Link>
            ))}
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

export const AlbumDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const {
    commercialUseMode,
    isSavedCollection,
    toggleSaveCollection,
    recordPlay,
  } = useLibrary();
  const { playTrack } = usePlayerStore();
  const [modalTrack, setModalTrack] = useState<NormalizedTrack | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['album', id, commercialUseMode],
    queryFn: () =>
      apiFetch<{ album: NormalizedAlbum; tracks: NormalizedTrack[] }>(
        `/api/music/albums/${id}?commercialMode=${commercialUseMode}`
      ),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return <div className="h-64 rounded-2xl bg-[#181818] animate-pulse" />;
  }
  if (isError || !data) {
    return (
      <div className="rounded-2xl bg-[#181818] p-8 text-center text-sm text-[#B3B3B3]">
        Album details unavailable.
      </div>
    );
  }

  const saved = isSavedCollection('album', data.album.id);

  return (
    <div className="space-y-8">
      <section className="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 lg:-mx-8 lg:-mt-6 px-4 pt-6 pb-6 sm:px-6 lg:px-8 bg-gradient-to-b from-[#2A2A2A] via-[#1B1B1B] to-[#121212] flex flex-col sm:flex-row items-center sm:items-end gap-6">
        <ArtworkImage
          src={data.album.artworkUrl}
          alt={data.album.name}
          className="w-44 h-44 sm:w-48 sm:h-48 rounded-lg mx-auto sm:mx-0 shadow-[0_20px_50px_rgba(0,0,0,0.65)]"
        />
        <div className="flex-1 text-center sm:text-left space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[#1ED760]">
            Album · {data.album.releaseDate || 'Independent Release'}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
            {data.album.name}
          </h1>
          <p className="text-sm text-[#B3B3B3]">
            <Link
              to={`/artist/${data.album.artistId}`}
              className="text-white font-semibold hover:underline underline-offset-4"
            >
              {data.album.artistName}
            </Link>
            <span className="mx-2">·</span>
            <span>{data.tracks.length} songs</span>
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
            {data.tracks[0] && (
              <button
                type="button"
                onClick={() => {
                  void playTrack(data.tracks[0], data.tracks);
                  void recordPlay(data.tracks[0]);
                }}
                aria-label={`Play album ${data.album.name}`}
                className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#1ED760] text-black hover:bg-[#1FDF64] hover:scale-105 active:scale-95 transition-all shadow-xl"
              >
                <Play className="w-6 h-6 fill-black ml-0.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                void toggleSaveCollection({
                  collectionType: 'album',
                  providerId: data.album.id,
                  name: data.album.name,
                  subtitle: data.album.artistName,
                  artworkUrl: data.album.artworkUrl,
                })
              }
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold transition-colors min-h-[42px] ${
                saved
                  ? 'bg-[#1ED760]/15 text-[#1ED760] border border-[#1ED760]'
                  : 'bg-[#242424] text-white hover:bg-[#303030]'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${saved ? 'fill-[#1ED760]' : ''}`} />
              <span>{saved ? 'Saved Album' : 'Save Album'}</span>
            </button>
          </div>
        </div>
      </section>

      <section>
        <div className="rounded-xl bg-[#181818]/60 p-1 sm:p-2">
          {data.tracks.map((track, idx) => (
            <TrackRow
              key={track.id}
              track={track}
              index={idx}
              queueContext={data.tracks}
              onRequestAddToPlaylist={setModalTrack}
            />
          ))}
        </div>
      </section>

      <AddToPlaylistModal
        track={modalTrack}
        onClose={() => setModalTrack(null)}
      />
    </div>
  );
};
