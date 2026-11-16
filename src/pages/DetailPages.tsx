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
  const { commercialUseMode, isFavorite, toggleFavorite, startDownload, getDownloadEntry, recordPlay } =
    useLibrary();
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
    return <div className="h-64 rounded-2xl bg-[#15151B] animate-pulse" />;
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-[#262632] bg-[#15151B] p-8 text-center">
        <p className="text-sm text-[#9494A3]">Track details could not be loaded.</p>
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
      <section className="flex flex-col md:flex-row gap-8 rounded-2xl border border-[#22222E] bg-[#15151B] p-6 sm:p-8">
        <ArtworkImage
          src={track.artworkUrl}
          alt={track.title}
          className="w-48 h-48 sm:w-56 sm:h-56 rounded-xl mx-auto md:mx-0"
        />

        <div className="flex-1 space-y-4 min-w-0">
          <div>
            <p className="text-xs font-medium text-violet-400">
              {track.genre} · {track.isInstrumental ? 'Instrumental' : 'Vocal'}
            </p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#F5F5F7]">
              {track.title}
            </h1>
            <p className="mt-1.5 text-sm text-[#9494A3]">
              <Link
                to={`/artist/${track.artistId}`}
                className="text-[#F5F5F7] hover:underline underline-offset-4"
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

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                void playTrack(track, [track, ...similar]);
                void recordPlay(track);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Play Track</span>
            </button>

            <button
              type="button"
              onClick={() => void toggleFavorite(track)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#2A2A38] bg-[#1A1A22] px-4 py-2.5 text-sm font-medium text-[#F5F5F7] hover:border-violet-500/40"
            >
              <Heart
                className={`w-4 h-4 ${
                  favorited ? 'fill-violet-400 text-violet-400' : ''
                }`}
              />
              <span>{favorited ? 'Favorited' : 'Favorite'}</span>
            </button>

            {isDownloaded ? (
              <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-300">
                <CheckCircle2 className="w-4 h-4" />
                Available Offline
              </span>
            ) : permitted ? (
              <button
                type="button"
                onClick={() => void handleDownload()}
                className="inline-flex items-center gap-2 rounded-lg border border-[#2A2A38] bg-[#1A1A22] px-4 py-2.5 text-sm font-medium text-[#F5F5F7] hover:border-violet-500/40"
              >
                <Download className="w-4 h-4 text-violet-400" />
                <span>Download Offline</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-lg border border-[#262632] bg-[#121217] px-4 py-2.5 text-xs text-[#9494A3]">
                <Lock className="w-3.5 h-3.5" />
                Download Restricted
              </span>
            )}
          </div>

          {dlMessage && (
            <p className="text-xs text-violet-300">{dlMessage}</p>
          )}
        </div>
      </section>

      {/* Licensing & Attribution Verification Panel */}
      <section className="rounded-2xl border border-[#22222E] bg-[#15151B] p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-violet-400" />
          <h2 className="font-display text-lg font-semibold text-[#F5F5F7]">
            Licensing &amp; Attribution Verification
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="rounded-lg border border-[#22222E] bg-[#111116] p-3.5">
            <p className="text-[#9494A3]">Licence Type</p>
            <p className="mt-1 text-sm font-semibold text-[#F5F5F7]">
              {track.licenseType}
            </p>
          </div>
          <div className="rounded-lg border border-[#22222E] bg-[#111116] p-3.5">
            <p className="text-[#9494A3]">Download Permission</p>
            <p className="mt-1 text-sm font-semibold text-[#F5F5F7]">
              {track.audiodownloadAllowed
                ? 'Permitted by Artist'
                : 'Streaming Only'}
            </p>
          </div>
          <div className="rounded-lg border border-[#22222E] bg-[#111116] p-3.5">
            <p className="text-[#9494A3]">Commercial Use</p>
            <p className="mt-1 text-sm font-semibold text-[#F5F5F7]">
              {track.licenseEvaluation.commercialUsePermitted
                ? 'Allowed with Attribution'
                : 'Non-Commercial Only'}
            </p>
          </div>
          <div className="rounded-lg border border-[#22222E] bg-[#111116] p-3.5">
            <p className="text-[#9494A3]">Derivatives / Transcoding</p>
            <p className="mt-1 text-sm font-semibold text-[#F5F5F7]">
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

        <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-[#9494A3] border-t border-[#22222E]">
          <span>
            Artist Credit: <strong className="text-[#F5F5F7]">{track.artistName}</strong>
          </span>
          <span>Source: Jamendo Music API v3.0</span>
          <a
            href={track.originalTrackUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-violet-400 hover:text-violet-300 underline underline-offset-4"
          >
            Original Jamendo Track Page
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href={track.licenseUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[#F5F5F7] hover:text-violet-300 underline underline-offset-4"
          >
            Official Licence Deed
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </section>

      {similar.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold text-[#F5F5F7] mb-3">
            Similar Tracks
          </h2>
          <div className="rounded-xl border border-[#22222E] bg-[#15151B] p-2">
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
    return <div className="h-64 rounded-2xl bg-[#15151B] animate-pulse" />;
  }
  if (isError || !data) {
    return (
      <div className="rounded-xl border border-[#262632] bg-[#15151B] p-8 text-center text-sm text-[#9494A3]">
        Artist details unavailable.
      </div>
    );
  }

  const saved = isSavedCollection('artist', data.artist.id);

  return (
    <div className="space-y-8">
      <section className="flex flex-col sm:flex-row items-center sm:items-start gap-6 rounded-2xl border border-[#22222E] bg-[#15151B] p-6 sm:p-8">
        <ArtworkImage
          src={data.artist.imageUrl}
          alt={data.artist.name}
          className="w-36 h-36 rounded-full border border-[#262632]"
        />
        <div className="flex-1 text-center sm:text-left space-y-3">
          <p className="text-xs font-medium text-violet-400">
            {data.artist.genre || 'Independent Artist'}
          </p>
          <h1 className="font-display text-3xl font-bold text-[#F5F5F7]">
            {data.artist.name}
          </h1>
          {data.artist.bio && (
            <p className="text-sm text-[#9494A3] max-w-2xl">{data.artist.bio}</p>
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
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-medium transition-colors ${
                saved
                  ? 'border-violet-500 bg-violet-500/15 text-violet-300'
                  : 'border-[#2A2A38] bg-[#1A1A22] text-[#F5F5F7]'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-violet-400' : ''}`} />
              <span>{saved ? 'Saved in Library' : 'Save Artist'}</span>
            </button>
            <a
              href={data.artist.shareUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#9494A3] hover:text-white underline underline-offset-4"
            >
              Jamendo Artist Page
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-[#F5F5F7] mb-3">
          Tracks ({data.tracks.length})
        </h2>
        <div className="rounded-xl border border-[#22222E] bg-[#15151B] p-2">
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
          <h2 className="font-display text-lg font-semibold text-[#F5F5F7] mb-3">
            Albums
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {data.albums.map((alb) => (
              <Link
                key={alb.id}
                to={`/album/${alb.id}`}
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
                <p className="text-xs text-[#9494A3]">{alb.releaseDate}</p>
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
  const { commercialUseMode, isSavedCollection, toggleSaveCollection, recordPlay } =
    useLibrary();
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
    return <div className="h-64 rounded-2xl bg-[#15151B] animate-pulse" />;
  }
  if (isError || !data) {
    return (
      <div className="rounded-xl border border-[#262632] bg-[#15151B] p-8 text-center text-sm text-[#9494A3]">
        Album details unavailable.
      </div>
    );
  }

  const saved = isSavedCollection('album', data.album.id);

  return (
    <div className="space-y-8">
      <section className="flex flex-col sm:flex-row gap-6 rounded-2xl border border-[#22222E] bg-[#15151B] p-6 sm:p-8">
        <ArtworkImage
          src={data.album.artworkUrl}
          alt={data.album.name}
          className="w-44 h-44 rounded-xl mx-auto sm:mx-0"
        />
        <div className="flex-1 space-y-3">
          <p className="text-xs font-medium text-violet-400">
            Album · {data.album.releaseDate || 'Independent Release'}
          </p>
          <h1 className="font-display text-3xl font-bold text-[#F5F5F7]">
            {data.album.name}
          </h1>
          <p className="text-sm text-[#9494A3]">
            <Link
              to={`/artist/${data.album.artistId}`}
              className="text-[#F5F5F7] hover:underline underline-offset-4"
            >
              {data.album.artistName}
            </Link>
            <span className="mx-2">·</span>
            <span>{data.tracks.length} tracks</span>
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {data.tracks[0] && (
              <button
                type="button"
                onClick={() => {
                  void playTrack(data.tracks[0], data.tracks);
                  void recordPlay(data.tracks[0]);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Play Album</span>
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
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                saved
                  ? 'border-violet-500 bg-violet-500/15 text-violet-300'
                  : 'border-[#2A2A38] bg-[#1A1A22] text-[#F5F5F7]'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${saved ? 'fill-violet-400' : ''}`} />
              <span>{saved ? 'Saved Album' : 'Save Album'}</span>
            </button>
          </div>
        </div>
      </section>

      <section>
        <div className="rounded-xl border border-[#22222E] bg-[#15151B] p-2">
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
