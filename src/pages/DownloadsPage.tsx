import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  FileAudio,
  FileVideo,
  HardDrive,
  ListPlus,
  Play,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext.tsx';
import { usePlayerStore } from '../store/usePlayerStore.ts';
import { formatBytes, formatDuration } from '../utils/playerLogic.ts';
import {
  localMediaToNormalizedTrack,
  type LocalMediaRecord,
} from '../utils/localMedia.ts';
import { getLocalMediaObjectUrl } from '../lib/offlineStorage.ts';
import type { NormalizedTrack } from '../types/music.ts';
import { ArtworkImage } from '../components/ArtworkImage.tsx';
import { LocalMediaImporter } from '../components/LocalMediaImporter.tsx';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal.tsx';

export const DownloadsPage: React.FC = () => {
  const {
    downloads,
    localMedia,
    storageInfo,
    cancelDownload,
    removeDownload,
    removeLocalMedia,
    startDownload,
    recordPlay,
  } = useLibrary();
  const { playTrack, pausePlayback, isPlaying } = usePlayerStore();

  const [mediaFilter, setMediaFilter] = useState<'all' | 'audio' | 'video'>('all');
  const [activeVideo, setActiveVideo] = useState<LocalMediaRecord | null>(null);
  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [modalTrack, setModalTrack] = useState<NormalizedTrack | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const completed = downloads.filter((d) => d.status === 'completed');
  const active = downloads.filter((d) => d.status === 'downloading');
  const failed = downloads.filter(
    (d) =>
      d.status === 'failed' || d.status === 'cancelled' || d.status === 'expired'
  );

  const filteredLocalMedia = localMedia.filter((item) =>
    mediaFilter === 'all' ? true : item.mediaType === mediaFilter
  );
  const localAudioTracks = localMedia
    .filter((item) => item.mediaType === 'audio')
    .map(localMediaToNormalizedTrack);

  const totalAudioBytes = completed.reduce(
    (sum, d) => sum + (d.fileSizeBytes || 0),
    0
  );
  const totalLocalBytes = localMedia.reduce(
    (sum, m) => sum + (m.fileSizeBytes || 0),
    0
  );

  const usagePct =
    storageInfo.quotaBytes > 0
      ? Math.min(100, (storageInfo.usageBytes / storageInfo.quotaBytes) * 100)
      : 0;

  // Pause active HTML5 video if GlobalPlayer starts playing audio
  useEffect(() => {
    if (isPlaying && videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  // Revoke object URL on unmount or when switching active video
  useEffect(() => {
    return () => {
      if (videoObjectUrl) {
        URL.revokeObjectURL(videoObjectUrl);
      }
    };
  }, [videoObjectUrl]);

  const handleCloseVideoStage = () => {
    if (videoObjectUrl) {
      URL.revokeObjectURL(videoObjectUrl);
    }
    setVideoObjectUrl(null);
    setActiveVideo(null);
    setVideoError(null);
  };

  const handlePlayLocalItem = async (item: LocalMediaRecord) => {
    if (item.mediaType === 'audio') {
      handleCloseVideoStage();
      const track = localMediaToNormalizedTrack(item);
      await playTrack(track, localAudioTracks);
      await recordPlay(track);
      return;
    }

    // Play local video in the Offline Video Stage
    pausePlayback();
    setVideoError(null);
    const url = await getLocalMediaObjectUrl(item.id);
    if (!url) {
      setVideoError('Unable to load this local video file from device storage.');
      return;
    }
    if (videoObjectUrl) {
      URL.revokeObjectURL(videoObjectUrl);
    }
    setActiveVideo(item);
    setVideoObjectUrl(url);
  };

  const handleDeleteLocalItem = async (item: LocalMediaRecord) => {
    if (activeVideo?.id === item.id) {
      handleCloseVideoStage();
    }
    await removeLocalMedia(item.id);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#F5F5F7]">
          Offline Media & Downloads
        </h1>
        <p className="mt-1 text-sm text-[#9494A3]">
          Import your own audio & video files for offline playback, and manage
          authorized Jamendo tracks stored in browser Cache Storage.
        </p>
      </div>

      {/* Storage Quota Summary */}
      <section className="rounded-xl border border-[#22222E] bg-[#15151B] p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-violet-400" />
            <div>
              <p className="text-sm font-semibold text-[#F5F5F7]">
                Offline Device Storage
              </p>
              <p className="text-xs text-[#9494A3]">
                {storageInfo.persisted
                  ? 'Persistent storage granted by browser'
                  : 'Best-effort browser storage (subject to device eviction limits)'}
              </p>
            </div>
          </div>
          <div className="text-right font-mono-tabular">
            <p className="text-sm font-semibold text-[#F5F5F7]">
              {formatBytes(totalAudioBytes + totalLocalBytes)} media stored
            </p>
            <p className="text-xs text-[#9494A3]">
              Total origin usage: {formatBytes(storageInfo.usageBytes)} /{' '}
              {storageInfo.quotaBytes > 0
                ? formatBytes(storageInfo.quotaBytes)
                : 'Available'}
            </p>
          </div>
        </div>

        <div className="h-2 w-full rounded-full bg-[#22222E] overflow-hidden">
          <div
            className="h-full bg-violet-500 transition-all"
            style={{ width: `${Math.max(2, usagePct)}%` }}
          />
        </div>
      </section>

      {/* Local Audio & Video Locker */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#F5F5F7]">
              Local Audio & Video Locker ({localMedia.length})
            </h2>
            <p className="text-xs text-[#9494A3]">
              Your imported MP3, M4A, WAV, FLAC, MP4, WebM & MOV files stay
              private on this device and work 100% offline.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Filter local media"
            className="flex items-center gap-1 p-1 rounded-lg bg-[#15151B] border border-[#22222E]"
          >
            {(
              [
                ['all', `All (${localMedia.length})`],
                [
                  'audio',
                  `Audio (${localMedia.filter((m) => m.mediaType === 'audio').length})`,
                ],
                [
                  'video',
                  `Video (${localMedia.filter((m) => m.mediaType === 'video').length})`,
                ],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={mediaFilter === key}
                onClick={() => setMediaFilter(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  mediaFilter === key
                    ? 'bg-violet-600 text-white'
                    : 'text-[#9494A3] hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <LocalMediaImporter />

        {/* In-App Offline Video Stage */}
        {activeVideo && videoObjectUrl && (
          <div
            aria-label="Offline local video player"
            className="rounded-2xl border border-[#2A2A38] bg-[#15151B] overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#22222E] px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-violet-400">
                  Offline Video Stage
                </p>
                <h3 className="truncate text-sm font-semibold text-[#F5F5F7]">
                  {activeVideo.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseVideoStage}
                aria-label="Close local video player"
                className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg border border-[#2A2A38] bg-[#181820] text-[#9494A3] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-black">
              <video
                ref={videoRef}
                key={activeVideo.id}
                src={videoObjectUrl}
                controls
                autoPlay
                playsInline
                onPlay={() => pausePlayback()}
                onError={() =>
                  setVideoError(
                    'This browser cannot decode the selected video codec.'
                  )
                }
                className="w-full max-h-[420px] mx-auto"
              />
            </div>
            {videoError && (
              <p className="px-4 py-2.5 text-xs text-rose-300 bg-rose-500/10 border-t border-rose-500/20">
                {videoError}
              </p>
            )}
          </div>
        )}

        {filteredLocalMedia.length === 0 ? (
          <div className="rounded-xl border border-[#22222E] bg-[#15151B] p-8 text-center space-y-2">
            <FileAudio className="w-7 h-7 text-[#666678] mx-auto" />
            <p className="text-sm font-medium text-[#F5F5F7]">
              {localMedia.length === 0
                ? 'No local files imported yet'
                : `No local ${mediaFilter} files in locker`}
            </p>
            <p className="text-xs text-[#9494A3] max-w-md mx-auto">
              Use Choose Files above to store your own songs or music videos in
              IndexedDB for offline listening and viewing.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-[#22222E] bg-[#15151B] divide-y divide-[#1E1E28]">
            {filteredLocalMedia.map((item) => {
              const isVideoActive = activeVideo?.id === item.id;
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3.5 transition-colors ${
                    isVideoActive ? 'bg-[#1B1B26]' : 'hover:bg-[#191922]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => void handlePlayLocalItem(item)}
                    aria-label={`Play local ${item.mediaType} ${item.title}`}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-violet-600/15 border border-violet-500/30 text-violet-300">
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
                      <p className="mt-0.5 truncate text-xs text-[#9494A3]">
                        {item.artist} · {item.mediaType.toUpperCase()} ·{' '}
                        <span className="font-mono-tabular">
                          {formatBytes(item.fileSizeBytes)}
                        </span>
                        {item.duration > 0 && (
                          <span className="font-mono-tabular">
                            {' '}
                            · {formatDuration(item.duration)}
                          </span>
                        )}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    {item.mediaType === 'audio' && (
                      <button
                        type="button"
                        onClick={() =>
                          setModalTrack(localMediaToNormalizedTrack(item))
                        }
                        aria-label={`Add ${item.title} to playlist`}
                        className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-[#9494A3] hover:text-violet-300 hover:bg-violet-500/10"
                      >
                        <ListPlus className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => void handlePlayLocalItem(item)}
                      aria-label={`Play ${item.title}`}
                      className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-violet-300 hover:bg-violet-500/15"
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDeleteLocalItem(item)}
                      aria-label={`Delete local file ${item.title}`}
                      className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-[#9494A3] hover:text-rose-400 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Active Downloads */}
      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-[#F5F5F7]">
            In Progress ({active.length})
          </h2>
          <div className="space-y-2">
            {active.map((d) => (
              <div
                key={d.trackId}
                className="flex items-center gap-4 rounded-xl border border-[#22222E] bg-[#15151B] p-4"
              >
                <ArtworkImage
                  src={d.track.artworkUrl}
                  alt={d.track.title}
                  className="w-12 h-12 rounded-lg"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-[#F5F5F7]">
                      {d.track.title}
                    </p>
                    <span className="text-xs font-mono-tabular text-violet-300">
                      {d.progress}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-[#22222E] overflow-hidden">
                    <div
                      className="h-full bg-violet-500 transition-all"
                      style={{ width: `${d.progress}%` }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => cancelDownload(d.trackId)}
                  aria-label={`Cancel download for ${d.track.title}`}
                  className="rounded-lg border border-[#2A2A38] px-3 py-1.5 text-xs text-[#9494A3] hover:text-white"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Completed Jamendo Downloads */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#F5F5F7]">
            Authorized Jamendo Offline Tracks ({completed.length})
          </h2>
          {completed.length > 0 && (
            <button
              type="button"
              onClick={() => {
                void playTrack(
                  completed[0].track,
                  completed.map((c) => c.track)
                );
                void recordPlay(completed[0].track);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-violet-500 whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              Play All Offline
            </button>
          )}
        </div>

        {completed.length === 0 ? (
          <div className="rounded-xl border border-[#22222E] bg-[#15151B] p-10 text-center space-y-2">
            <ShieldCheck className="w-7 h-7 text-[#666678] mx-auto" />
            <p className="text-sm font-medium text-[#F5F5F7]">
              No Jamendo offline tracks stored yet
            </p>
            <p className="text-xs text-[#9494A3] max-w-md mx-auto">
              Tracks with artist permission (audiodownload_allowed = true) and a
              compatible Creative Commons licence can be downloaded directly from
              Discover or Search.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-[#22222E] bg-[#15151B] divide-y divide-[#1E1E28]">
            {completed.map((d) => (
              <div
                key={d.trackId}
                className="flex items-center gap-3 p-3.5 hover:bg-[#191922] transition-colors"
              >
                <button
                  type="button"
                  onClick={() => {
                    void playTrack(
                      d.track,
                      completed.map((c) => c.track)
                    );
                    void recordPlay(d.track);
                  }}
                  aria-label={`Play offline track ${d.track.title}`}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <ArtworkImage
                    src={d.track.artworkUrl}
                    alt={d.track.title}
                    className="w-12 h-12 rounded-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#F5F5F7]">
                      {d.track.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[#9494A3]">
                      {d.track.artistName} · {d.licenseType} ·{' '}
                      <span className="font-mono-tabular">
                        {formatBytes(d.fileSizeBytes)}
                      </span>
                    </p>
                  </div>
                </button>

                <span className="hidden sm:inline-flex items-center gap-1 text-xs text-emerald-400 mr-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Cached
                </span>

                <button
                  type="button"
                  onClick={() => void removeDownload(d.trackId)}
                  aria-label={`Delete offline download ${d.track.title}`}
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-[#9494A3] hover:text-rose-400 hover:bg-rose-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Interrupted / Failed Downloads */}
      {failed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-[#F5F5F7]">
            Interrupted or Cancelled ({failed.length})
          </h2>
          <div className="rounded-xl border border-[#22222E] bg-[#15151B] divide-y divide-[#1E1E28]">
            {failed.map((d) => (
              <div
                key={d.trackId}
                className="flex items-center justify-between gap-3 p-3.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#F5F5F7]">
                      {d.track.title}
                    </p>
                    <p className="truncate text-xs text-[#9494A3]">
                      {d.errorMessage || 'Download interrupted'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void startDownload(d.track)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#2A2A38] px-3 py-1.5 text-xs text-[#F5F5F7] hover:border-violet-500/40"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeDownload(d.trackId)}
                    aria-label={`Clear failed download ${d.track.title}`}
                    className="p-2 text-[#9494A3] hover:text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
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
