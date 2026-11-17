import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  FileAudio,
  FileVideo,
  FolderCheck,
  FolderSync,
  HardDrive,
  Link2Off,
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
    linkedFolderStatus,
    isSyncingFolder,
    folderSyncNotice,
    linkDownloadsFolder,
    unlinkDownloadsFolder,
    syncLinkedFolder,
  } = useLibrary();
  const { playTrack, pausePlayback, isPlaying } = usePlayerStore();

  const [mediaFilter, setMediaFilter] = useState<'all' | 'audio' | 'video'>('all');
  const [activeVideo, setActiveVideo] = useState<LocalMediaRecord | null>(null);
  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [modalTrack, setModalTrack] = useState<NormalizedTrack | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (
      !linkedFolderStatus.linked ||
      linkedFolderStatus.permissionState !== 'granted'
    ) {
      return;
    }
    void syncLinkedFolder(false);
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void syncLinkedFolder(false);
      }
    }, 4000);
    return () => window.clearInterval(interval);
  }, [
    linkedFolderStatus.linked,
    linkedFolderStatus.permissionState,
    syncLinkedFolder,
  ]);

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

  useEffect(() => {
    if (isPlaying && videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  }, [isPlaying]);

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
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
          Offline Media &amp; Downloads
        </h1>
        <p className="mt-1 text-sm text-[#B3B3B3]">
          Import audio &amp; video files from your device and manage cached offline tracks.
        </p>
      </div>

      {/* Storage Quota Summary */}
      <section className="rounded-2xl bg-[#181818] p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1ED760]/15 text-[#1ED760]">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                Offline Device Storage
              </p>
              <p className="text-xs text-[#B3B3B3]">
                {storageInfo.persisted
                  ? 'Persistent storage granted'
                  : 'Browser-managed offline storage'}
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right font-mono-tabular">
            <p className="text-sm font-bold text-white">
              {formatBytes(totalAudioBytes + totalLocalBytes)} media stored
            </p>
            <p className="text-xs text-[#B3B3B3]">
              Origin usage: {formatBytes(storageInfo.usageBytes)} /{' '}
              {storageInfo.quotaBytes > 0
                ? formatBytes(storageInfo.quotaBytes)
                : 'Available'}
            </p>
          </div>
        </div>

        <div className="h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
          <div
            className="h-full bg-[#1ED760] transition-all"
            style={{ width: `${Math.max(2, usagePct)}%` }}
          />
        </div>
      </section>

      {/* Local Audio & Video Locker */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              Local Audio &amp; Video Locker ({localMedia.length})
            </h2>
            <p className="text-xs text-[#B3B3B3]">
              Imported MP3, M4A, WAV, FLAC, MP4, WebM &amp; MOV files stay private on this device.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Filter local media"
            className="flex items-center gap-1.5"
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
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors min-h-[34px] ${
                  mediaFilter === key
                    ? 'bg-[#1ED760] text-black'
                    : 'bg-[#242424] text-white hover:bg-[#2E2E2E]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Linked Downloads Folder Auto-Sync Card */}
        <div className="rounded-2xl bg-[#181818] border border-white/10 p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1ED760]/15 text-[#1ED760]">
                {linkedFolderStatus.linked ? (
                  <FolderCheck className="w-5 h-5" />
                ) : (
                  <FolderSync className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-white">
                    {linkedFolderStatus.linked
                      ? `Linked Folder: ${linkedFolderStatus.folderName}`
                      : 'Auto-Sync Downloads Folder'}
                  </p>
                  {linkedFolderStatus.linked &&
                    linkedFolderStatus.permissionState === 'granted' && (
                      <span className="rounded-full bg-[#1ED760]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#1ED760]">
                        Auto-syncing
                      </span>
                    )}
                </div>
                <p className="mt-1 text-xs text-[#B3B3B3]">
                  {linkedFolderStatus.linked
                    ? linkedFolderStatus.permissionState === 'granted'
                      ? 'Finished MP3/MP4 downloads in this folder automatically appear below whenever you switch back from y2mate.'
                      : 'Permission is paused for this session. Tap Sync Now to resume automatic detection.'
                    : linkedFolderStatus.supported
                    ? 'Link your browser Downloads folder once so finished downloads from y2mate automatically appear here.'
                    : 'Your mobile browser restricts background folder watching. Save downloads to Files / Downloads and tap Choose Files below to add them immediately.'}
                </p>
              </div>
            </div>

            {linkedFolderStatus.supported && (
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {linkedFolderStatus.linked ? (
                  <>
                    <button
                      type="button"
                      disabled={isSyncingFolder}
                      onClick={() => {
                        setFolderError(null);
                        void syncLinkedFolder(true).catch((err) => {
                          setFolderError(
                            err instanceof Error
                              ? err.message
                              : 'Unable to scan linked folder.'
                          );
                        });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#1ED760] px-4 py-2.5 text-xs font-bold text-black hover:bg-[#1FDF64] disabled:opacity-60 transition-colors whitespace-nowrap min-h-[40px]"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${
                          isSyncingFolder ? 'animate-spin' : ''
                        }`}
                      />
                      <span>{isSyncingFolder ? 'Syncing...' : 'Sync Now'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFolderError(null);
                        void unlinkDownloadsFolder();
                      }}
                      aria-label="Unlink Downloads folder"
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#242424] px-3.5 py-2.5 text-xs font-semibold text-[#B3B3B3] hover:text-white hover:bg-[#303030] transition-colors whitespace-nowrap min-h-[40px]"
                    >
                      <Link2Off className="w-3.5 h-3.5" />
                      <span>Unlink</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setFolderError(null);
                      void linkDownloadsFolder().catch((err) => {
                        setFolderError(
                          err instanceof Error
                            ? err.message
                            : 'Unable to link Downloads folder.'
                        );
                      });
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-[#1ED760] px-5 py-2.5 text-xs font-bold text-black hover:bg-[#1FDF64] active:scale-[0.97] transition-all whitespace-nowrap min-h-[44px]"
                  >
                    <FolderSync className="w-4 h-4" />
                    <span>Link Downloads Folder</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {folderSyncNotice && (
            <p
              role="status"
              className="rounded-xl bg-[#1ED760]/15 border border-[#1ED760]/30 px-3.5 py-2 text-xs font-medium text-[#1ED760]"
            >
              {folderSyncNotice}
            </p>
          )}
          {folderError && (
            <p
              role="alert"
              className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-3.5 py-2 text-xs text-rose-300"
            >
              {folderError}
            </p>
          )}
        </div>

        <LocalMediaImporter />

        {/* In-App Offline Video Stage */}
        {activeVideo && videoObjectUrl && (
          <div
            aria-label="Offline local video player"
            className="rounded-2xl bg-[#181818] border border-white/10 overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#1ED760]">
                  Offline Video Stage
                </p>
                <h3 className="truncate text-sm font-bold text-white">
                  {activeVideo.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseVideoStage}
                aria-label="Close local video player"
                className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-full bg-[#242424] text-[#B3B3B3] hover:text-white"
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
          <div className="rounded-2xl bg-[#181818] p-8 text-center space-y-2">
            <FileAudio className="w-7 h-7 text-[#B3B3B3] mx-auto" />
            <p className="text-sm font-bold text-white">
              {localMedia.length === 0
                ? 'No local files imported yet'
                : `No local ${mediaFilter} files in locker`}
            </p>
            <p className="text-xs text-[#B3B3B3] max-w-md mx-auto">
              Use Choose Files above to store songs or music videos offline on this device.
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-[#181818] divide-y divide-white/[0.06]">
            {filteredLocalMedia.map((item) => {
              const isVideoActive = activeVideo?.id === item.id;
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3.5 transition-colors ${
                    isVideoActive ? 'bg-white/10' : 'hover:bg-white/[0.05]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => void handlePlayLocalItem(item)}
                    aria-label={`Play local ${item.mediaType} ${item.title}`}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
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
                      <p className="mt-0.5 truncate text-xs text-[#B3B3B3]">
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
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[#B3B3B3] hover:text-white transition-colors"
                      >
                        <ListPlus className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => void handlePlayLocalItem(item)}
                      aria-label={`Play ${item.title}`}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[#1ED760] hover:bg-[#1ED760]/15 transition-colors"
                    >
                      <Play className="w-5 h-5 fill-[#1ED760]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDeleteLocalItem(item)}
                      aria-label={`Delete local file ${item.title}`}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[#B3B3B3] hover:text-rose-400 transition-colors"
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
          <h2 className="font-display text-lg font-bold text-white">
            In Progress ({active.length})
          </h2>
          <div className="space-y-2">
            {active.map((d) => (
              <div
                key={d.trackId}
                className="flex items-center gap-4 rounded-xl bg-[#181818] p-4"
              >
                <ArtworkImage
                  src={d.track.artworkUrl}
                  alt={d.track.title}
                  className="w-12 h-12 rounded-md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-white">
                      {d.track.title}
                    </p>
                    <span className="text-xs font-mono-tabular text-[#1ED760]">
                      {d.progress}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
                    <div
                      className="h-full bg-[#1ED760] transition-all"
                      style={{ width: `${d.progress}%` }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => cancelDownload(d.trackId)}
                  aria-label={`Cancel download for ${d.track.title}`}
                  className="rounded-full bg-[#242424] px-4 py-1.5 text-xs font-semibold text-[#B3B3B3] hover:text-white"
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
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-white">
            Cached Offline Tracks ({completed.length})
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
              className="inline-flex items-center gap-1.5 rounded-full bg-[#1ED760] px-5 py-2.5 text-xs font-bold text-black hover:bg-[#1FDF64] active:scale-[0.97] transition-all whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              Play All Offline
            </button>
          )}
        </div>

        {completed.length === 0 ? (
          <div className="rounded-2xl bg-[#181818] p-10 text-center space-y-2">
            <ShieldCheck className="w-7 h-7 text-[#B3B3B3] mx-auto" />
            <p className="text-sm font-bold text-white">
              No offline tracks cached yet
            </p>
            <p className="text-xs text-[#B3B3B3] max-w-md mx-auto">
              Tracks cached inside Vesper Audio appear here for offline playback alongside your linked Downloads locker above.
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-[#181818] divide-y divide-white/[0.06]">
            {completed.map((d) => (
              <div
                key={d.trackId}
                className="flex items-center gap-3 p-3.5 hover:bg-white/[0.05] transition-colors"
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
                    className="w-12 h-12 rounded-md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {d.track.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[#B3B3B3]">
                      {d.track.artistName} · {d.licenseType} ·{' '}
                      <span className="font-mono-tabular">
                        {formatBytes(d.fileSizeBytes)}
                      </span>
                    </p>
                  </div>
                </button>

                <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-[#1ED760] mr-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Downloaded
                </span>

                <button
                  type="button"
                  onClick={() => void removeDownload(d.trackId)}
                  aria-label={`Delete offline download ${d.track.title}`}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[#B3B3B3] hover:text-rose-400 transition-colors"
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
          <h2 className="font-display text-lg font-bold text-white">
            Interrupted or Cancelled ({failed.length})
          </h2>
          <div className="rounded-xl bg-[#181818] divide-y divide-white/[0.06]">
            {failed.map((d) => (
              <div
                key={d.trackId}
                className="flex items-center justify-between gap-3 p-3.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {d.track.title}
                    </p>
                    <p className="truncate text-xs text-[#B3B3B3]">
                      {d.errorMessage || 'Download interrupted'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void startDownload(d.track)}
                    className="inline-flex items-center gap-1 rounded-full bg-[#242424] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#303030]"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeDownload(d.trackId)}
                    aria-label={`Clear failed download ${d.track.title}`}
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center text-[#B3B3B3] hover:text-rose-400 rounded-full"
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
