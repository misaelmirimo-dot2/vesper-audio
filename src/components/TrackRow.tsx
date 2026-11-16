import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Download,
  Heart,
  ListPlus,
  Loader2,
  Lock,
  Pause,
  Play,
  Trash2,
} from 'lucide-react';
import type { NormalizedTrack } from '../types/music.ts';
import { usePlayerStore } from '../store/usePlayerStore.ts';
import { useLibrary } from '../context/LibraryContext.tsx';
import { formatDuration } from '../utils/playerLogic.ts';
import { ArtworkImage } from './ArtworkImage.tsx';

interface TrackRowProps {
  track: NormalizedTrack;
  queueContext?: NormalizedTrack[];
  index?: number;
  onRequestAddToPlaylist?: (track: NormalizedTrack) => void;
  extraAction?: React.ReactNode;
}

export const TrackRow: React.FC<TrackRowProps> = ({
  track,
  queueContext,
  index,
  onRequestAddToPlaylist,
  extraAction,
}) => {
  const { queue, currentIndex, isPlaying, playTrack, togglePlay } =
    usePlayerStore();
  const {
    isFavorite,
    toggleFavorite,
    getDownloadEntry,
    startDownload,
    removeDownload,
    recordPlay,
    commercialUseMode,
  } = useLibrary();
  const [dlError, setDlError] = useState<string | null>(null);
  const [showBlockedInfo, setShowBlockedInfo] = useState(false);

  const currentTrack = queue[currentIndex];
  const isCurrent = currentTrack?.id === track.id;
  const isCurrentPlaying = isCurrent && isPlaying;
  const favorited = isFavorite(track.id);
  const downloadEntry = getDownloadEntry(track.id);
  const isDownloaded = downloadEntry?.status === 'completed';
  const isDownloading = downloadEntry?.status === 'downloading';

  // Client display mirrors server license evaluation; commercial mode also checked by backend
  const permitted =
    track.licenseEvaluation.offlineDownloadPermitted &&
    (!commercialUseMode || track.licenseEvaluation.commercialUsePermitted);

  const blockedMessage = !track.audiodownloadAllowed
    ? 'Streaming only: artist disabled offline downloads on Jamendo (audiodownload_allowed = false).'
    : commercialUseMode && !track.licenseEvaluation.commercialUsePermitted
    ? `Blocked in Commercial Use mode (${track.licenseType}). Switch off Commercial Use mode in Settings for personal offline listening.`
    : track.licenseEvaluation.blockedReason ||
      'Offline download unavailable under current licensing policy.';

  const handlePlay = async () => {
    if (isCurrent) {
      await togglePlay();
    } else {
      await playTrack(track, queueContext);
      void recordPlay(track);
    }
  };

  const handleDownload = async () => {
    setDlError(null);
    if (!permitted) {
      setShowBlockedInfo((v) => !v);
      return;
    }
    try {
      await startDownload(track);
    } catch (err) {
      setDlError(err instanceof Error ? err.message : 'Download failed');
    }
  };

  return (
    <div className="group border-b border-[#1C1C2E] last:border-b-0 transition-colors">
      <div className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl hover:bg-[#13131D] transition-all">
        {typeof index === 'number' && (
          <span className="hidden sm:block w-6 text-right text-xs font-mono-tabular text-[#64748B]">
            {index + 1}
          </span>
        )}

        <button
          type="button"
          onClick={() => void handlePlay()}
          aria-label={
            isCurrentPlaying
              ? `Pause ${track.title}`
              : `Play ${track.title}`
          }
          className="relative flex items-center justify-center w-11 h-11 rounded-xl overflow-hidden shrink-0 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          <ArtworkImage
            src={track.artworkUrl}
            alt={`${track.title} artwork`}
            className="w-11 h-11 rounded-xl transition-transform group-hover:scale-105"
          />
          <span
            className={`absolute inset-0 flex items-center justify-center bg-black/55 transition-opacity ${
              isCurrent
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
            }`}
          >
            {isCurrentPlaying ? (
              <Pause className="w-4 h-4 text-white fill-white" />
            ) : (
              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
            )}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            {track.provider === 'local' ? (
              <span
                className={`truncate text-sm font-medium ${
                  isCurrent ? 'text-sky-400 font-semibold' : 'text-[#F8FAFC]'
                }`}
              >
                {track.title}
              </span>
            ) : (
              <Link
                to={`/track/${track.id}`}
                className={`truncate text-sm font-medium hover:underline underline-offset-4 ${
                  isCurrent ? 'text-sky-400 font-semibold' : 'text-[#F8FAFC]'
                }`}
              >
                {track.title}
              </Link>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#94A3B8] truncate">
            {track.provider === 'local' ? (
              <>
                <span className="truncate">{track.artistName}</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#64748B]">Local Offline</span>
              </>
            ) : (
              <>
                <Link
                  to={`/artist/${track.artistId}`}
                  className="hover:text-[#F8FAFC] truncate"
                >
                  {track.artistName}
                </Link>
                <span aria-hidden="true">·</span>
                <Link
                  to={`/album/${track.albumId}`}
                  className="hidden sm:inline hover:text-[#F8FAFC] truncate"
                >
                  {track.albumName}
                </Link>
                <span className="hidden sm:inline" aria-hidden="true">
                  ·
                </span>
                <span className="text-[#64748B]">{track.licenseType}</span>
              </>
            )}
          </div>
        </div>

        <span className="hidden md:inline-block text-xs font-mono-tabular text-[#94A3B8] w-12 text-right shrink-0">
          {formatDuration(track.duration)}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => void toggleFavorite(track)}
            aria-label={
              favorited
                ? `Remove ${track.title} from favorites`
                : `Add ${track.title} to favorites`
            }
            className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
              favorited
                ? 'text-sky-400 hover:bg-sky-500/15'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#13131D]'
            }`}
          >
            <Heart
              className={`w-4 h-4 ${favorited ? 'fill-sky-400' : ''}`}
            />
          </button>

          {onRequestAddToPlaylist && (
            <button
              type="button"
              onClick={() => onRequestAddToPlaylist(track)}
              aria-label={`Add ${track.title} to playlist`}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#13131D] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <ListPlus className="w-4 h-4" />
            </button>
          )}

          {track.provider === 'local' ? (
            <span
              className="min-w-[40px] min-h-[40px] flex items-center justify-center text-emerald-400"
              title="Stored locally on this device"
            >
              <CheckCircle2 className="w-4 h-4" />
            </span>
          ) : isDownloaded ? (
            <button
              type="button"
              onClick={() => void removeDownload(track.id)}
              aria-label={`Remove offline download for ${track.title}`}
              title="Downloaded offline (click to remove)"
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-emerald-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <CheckCircle2 className="w-4 h-4 group-hover:hidden" />
              <Trash2 className="w-4 h-4 hidden group-hover:block" />
            </button>
          ) : isDownloading ? (
            <span
              className="min-w-[40px] min-h-[40px] flex items-center justify-center text-sky-400 text-xs font-mono-tabular"
              aria-label={`Downloading ${track.title}`}
            >
              <Loader2 className="w-4 h-4 animate-spin" />
            </span>
          ) : permitted ? (
            <button
              type="button"
              onClick={() => void handleDownload()}
              aria-label={`Download ${track.title} for offline listening`}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-[#94A3B8] hover:text-sky-400 hover:bg-sky-500/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <Download className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowBlockedInfo((v) => !v)}
              aria-label={`Download restricted for ${track.title}`}
              title={blockedMessage}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-[#64748B] hover:text-[#94A3B8] hover:bg-[#13131D] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}

          {extraAction}
        </div>
      </div>

      {showBlockedInfo && !permitted && (
        <div className="mx-3 mb-2.5 rounded-xl border border-[#1C1C2E] bg-[#0A0A10] px-3.5 py-2.5 text-xs text-[#94A3B8]">
          <span className="font-medium text-[#F8FAFC]">Download unavailable: </span>
          {blockedMessage}
        </div>
      )}

      {dlError && (
        <div className="mx-3 mb-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-400">
          {dlError}
        </div>
      )}
    </div>
  );
};
