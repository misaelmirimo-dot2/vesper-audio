import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownCircle,
  CheckCircle2,
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
    <div className="group transition-colors">
      <div
        className={`flex items-center gap-3 px-2.5 sm:px-3.5 py-2.5 rounded-lg transition-colors ${
          isCurrent ? 'bg-white/[0.07]' : 'hover:bg-white/[0.06]'
        }`}
      >
        {typeof index === 'number' && (
          <span
            className={`hidden sm:block w-5 text-right text-xs font-mono-tabular ${
              isCurrent ? 'text-[#1ED760] font-semibold' : 'text-[#B3B3B3]'
            }`}
          >
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
          className="relative flex items-center justify-center w-12 h-12 sm:w-11 sm:h-11 rounded-md overflow-hidden shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1ED760]"
        >
          <ArtworkImage
            src={track.artworkUrl}
            alt={`${track.title} artwork`}
            className="w-12 h-12 sm:w-11 sm:h-11 rounded-md"
          />
          <span
            className={`absolute inset-0 flex items-center justify-center bg-black/55 transition-opacity ${
              isCurrent
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
            }`}
          >
            {isCurrentPlaying ? (
              <Pause className="w-4 h-4 text-[#1ED760] fill-[#1ED760]" />
            ) : (
              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
            )}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            {track.provider === 'local' ? (
              <button
                type="button"
                onClick={() => void handlePlay()}
                className={`truncate text-left text-[15px] sm:text-sm font-medium ${
                  isCurrent ? 'text-[#1ED760] font-semibold' : 'text-white'
                }`}
              >
                {track.title}
              </button>
            ) : (
              <Link
                to={`/track/${track.id}`}
                className={`truncate text-[15px] sm:text-sm font-medium hover:underline underline-offset-4 ${
                  isCurrent ? 'text-[#1ED760] font-semibold' : 'text-white'
                }`}
              >
                {track.title}
              </Link>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#B3B3B3] truncate">
            {isDownloaded && (
              <CheckCircle2
                className="w-3.5 h-3.5 text-[#1ED760] shrink-0"
                aria-label="Downloaded offline"
              />
            )}
            {track.provider === 'local' ? (
              <>
                <span className="truncate">{track.artistName}</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#727272]">Local</span>
              </>
            ) : (
              <>
                <Link
                  to={`/artist/${track.artistId}`}
                  className="hover:text-white truncate"
                >
                  {track.artistName}
                </Link>
                <span className="hidden sm:inline" aria-hidden="true">
                  ·
                </span>
                <Link
                  to={`/album/${track.albumId}`}
                  className="hidden sm:inline hover:text-white truncate"
                >
                  {track.albumName}
                </Link>
              </>
            )}
          </div>
        </div>

        <span className="hidden md:inline-block text-xs font-mono-tabular text-[#B3B3B3] w-11 text-right shrink-0">
          {formatDuration(track.duration)}
        </span>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => void toggleFavorite(track)}
            aria-label={
              favorited
                ? `Remove ${track.title} from favorites`
                : `Add ${track.title} to favorites`
            }
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1ED760] ${
              favorited
                ? 'text-[#1ED760]'
                : 'text-[#B3B3B3] hover:text-white'
            }`}
          >
            <Heart
              className={`w-[18px] h-[18px] ${
                favorited ? 'fill-[#1ED760]' : ''
              }`}
            />
          </button>

          {onRequestAddToPlaylist && (
            <button
              type="button"
              onClick={() => onRequestAddToPlaylist(track)}
              aria-label={`Add ${track.title} to playlist`}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[#B3B3B3] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1ED760]"
            >
              <ListPlus className="w-[18px] h-[18px]" />
            </button>
          )}

          {track.provider === 'local' ? (
            <span
              className="min-w-[40px] min-h-[44px] flex items-center justify-center text-[#1ED760]"
              title="Stored locally on this device"
            >
              <CheckCircle2 className="w-[18px] h-[18px]" />
            </span>
          ) : isDownloaded ? (
            <button
              type="button"
              onClick={() => void removeDownload(track.id)}
              aria-label={`Remove offline download for ${track.title}`}
              title="Downloaded offline (click to remove)"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[#1ED760] hover:text-rose-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1ED760]"
            >
              <CheckCircle2 className="w-[18px] h-[18px] group-hover:hidden" />
              <Trash2 className="w-[18px] h-[18px] hidden group-hover:block" />
            </button>
          ) : isDownloading ? (
            <span
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#1ED760] text-xs font-mono-tabular"
              aria-label={`Downloading ${track.title}`}
            >
              <Loader2 className="w-[18px] h-[18px] animate-spin" />
            </span>
          ) : permitted ? (
            <button
              type="button"
              onClick={() => void handleDownload()}
              aria-label={`Download ${track.title} for offline listening`}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[#B3B3B3] hover:text-[#1ED760] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1ED760]"
            >
              <ArrowDownCircle className="w-[18px] h-[18px]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowBlockedInfo((v) => !v)}
              aria-label={`Download restricted for ${track.title}`}
              title={blockedMessage}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[#727272] hover:text-[#B3B3B3] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1ED760]"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}

          {extraAction}
        </div>
      </div>

      {showBlockedInfo && !permitted && (
        <div className="mx-3 mb-2 rounded-lg bg-[#242424] px-3.5 py-2.5 text-xs text-[#B3B3B3]">
          <span className="font-semibold text-white">Download unavailable: </span>
          {blockedMessage}
        </div>
      )}

      {dlError && (
        <div className="mx-3 mb-2 rounded-lg bg-rose-500/15 px-3.5 py-2.5 text-xs text-rose-300">
          {dlError}
        </div>
      )}
    </div>
  );
};
