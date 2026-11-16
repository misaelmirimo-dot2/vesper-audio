import React from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  ExternalLink,
  Heart,
  ListMusic,
  Maximize2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  ShieldCheck,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  WifiOff,
  X,
} from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore.ts';
import { useLibrary } from '../context/LibraryContext.tsx';
import { formatDuration } from '../utils/playerLogic.ts';
import { ArtworkImage } from './ArtworkImage.tsx';

export const GlobalPlayer: React.FC = () => {
  const {
    queue,
    currentIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    repeat,
    shuffle,
    isFullScreen,
    isQueueOpen,
    isPlayingFromOfflineCache,
    playbackError,
    togglePlay,
    nextTrack,
    previousTrack,
    seek,
    setVolume,
    toggleShuffle,
    cycleRepeat,
    playTrack,
    removeFromQueue,
    setFullScreen,
    setQueueOpen,
    clearError,
  } = usePlayerStore();

  const { isFavorite, toggleFavorite } = useLibrary();

  const currentTrack = queue[currentIndex];
  const progressPct =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  if (!currentTrack) {
    return null;
  }

  const favorited = isFavorite(currentTrack.id);

  return (
    <>
      {/* Playback error banner */}
      {playbackError && (
        <div
          role="alert"
          className="fixed bottom-24 md:bottom-20 right-4 z-50 flex items-center gap-3 rounded-xl border border-rose-500/40 bg-[#1B1216] px-4 py-2.5 text-xs text-rose-200 shadow-xl"
        >
          <span>{playbackError}</span>
          <button
            type="button"
            onClick={clearError}
            aria-label="Dismiss playback error"
            className="text-rose-300 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Queue Side Drawer */}
      {isQueueOpen && (
        <aside
          aria-label="Playback Queue"
          className="fixed bottom-[76px] right-4 z-40 w-80 max-w-[calc(100vw-2rem)] max-h-[420px] flex flex-col rounded-2xl border border-[#1C1C2E] bg-[#0A0A10] shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-[#1C1C2E] px-4 py-3">
            <h3 className="text-sm font-semibold text-[#F8FAFC]">
              Up Next ({queue.length})
            </h3>
            <button
              type="button"
              onClick={() => setQueueOpen(false)}
              aria-label="Close playback queue"
              className="p-1.5 text-[#94A3B8] hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-[#1C1C2E] p-2">
            {queue.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors ${
                  idx === currentIndex ? 'bg-sky-500/15 text-sky-400' : 'hover:bg-[#13131D]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => void playTrack(item, queue)}
                  className="flex flex-1 items-center gap-2.5 min-w-0 text-left"
                >
                  <ArtworkImage
                    src={item.artworkUrl}
                    alt={item.title}
                    className="w-9 h-9 rounded-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-xs font-medium ${
                        idx === currentIndex
                          ? 'text-sky-400 font-semibold'
                          : 'text-[#F8FAFC]'
                      }`}
                    >
                      {item.title}
                    </p>
                    <p className="truncate text-[11px] text-[#94A3B8]">
                      {item.artistName}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => removeFromQueue(idx)}
                  aria-label={`Remove ${item.title} from queue`}
                  className="p-1.5 text-[#64748B] hover:text-rose-400 rounded-lg"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* Full-Screen Player Overlay */}
      {isFullScreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full screen music player"
          className="fixed inset-0 z-50 flex flex-col bg-[#030305] overflow-y-auto"
        >
          <header className="flex items-center justify-between px-6 py-4 border-b border-[#1C1C2E] bg-[#0A0A10]/80 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setFullScreen(false)}
              aria-label="Minimize full screen player"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#13131D] transition-colors"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
            <div className="text-center">
              <p className="text-xs font-medium text-[#94A3B8]">Now Playing</p>
              <p className="text-xs text-[#F8FAFC] truncate max-w-[220px]">
                {currentTrack.albumName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFullScreen(false);
                setQueueOpen(true);
              }}
              aria-label="Open queue"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#13131D] transition-colors"
            >
              <ListMusic className="w-5 h-5" />
            </button>
          </header>

          <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col lg:flex-row items-center justify-center gap-12 px-6 py-10">
            <div className="w-full max-w-sm">
              <ArtworkImage
                src={currentTrack.artworkUrl}
                alt={`${currentTrack.title} album cover`}
                className="w-full aspect-square rounded-2xl border border-[#1C1C2E] shadow-2xl shadow-sky-500/10"
              />
            </div>

            <div className="w-full max-w-md space-y-7">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#F8FAFC] truncate">
                    {currentTrack.title}
                  </h2>
                  <p className="mt-1.5 text-sm text-[#94A3B8]">
                    {currentTrack.provider === 'local' ? (
                      <span>{currentTrack.artistName}</span>
                    ) : (
                      <Link
                        to={`/artist/${currentTrack.artistId}`}
                        onClick={() => setFullScreen(false)}
                        className="hover:text-white underline-offset-4 hover:underline font-medium"
                      >
                        {currentTrack.artistName}
                      </Link>
                    )}
                    <span className="mx-1.5" aria-hidden="true">
                      ·
                    </span>
                    <span>{currentTrack.genre}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void toggleFavorite(currentTrack)}
                  aria-label={
                    favorited ? 'Remove from favorites' : 'Save to favorites'
                  }
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[#94A3B8] hover:text-sky-400 transition-colors"
                >
                  <Heart
                    className={`w-5 h-5 ${
                      favorited ? 'fill-sky-400 text-sky-400' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Seek slider */}
              <div>
                <input
                  type="range"
                  min={0}
                  max={duration || 1}
                  step={0.5}
                  value={Math.min(currentTime, duration || 1)}
                  onChange={(e) => seek(Number(e.target.value))}
                  aria-label="Seek audio position"
                  className="w-full accent-sky-500 cursor-pointer h-2 bg-[#1C1C2E] rounded-full"
                />
                <div className="mt-2.5 flex items-center justify-between text-xs font-mono-tabular text-[#94A3B8]">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(duration)}</span>
                </div>
              </div>

              {/* Playback buttons */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={toggleShuffle}
                  aria-label="Toggle shuffle"
                  aria-pressed={shuffle}
                  className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors ${
                    shuffle
                      ? 'text-sky-400 bg-sky-500/15'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <Shuffle className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => void previousTrack()}
                  aria-label="Previous track"
                  className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-xl text-[#F8FAFC] hover:bg-[#13131D]"
                >
                  <SkipBack className="w-6 h-6" />
                </button>

                <button
                  type="button"
                  onClick={() => void togglePlay()}
                  aria-label={isPlaying ? 'Pause playback' : 'Start playback'}
                  className="flex items-center justify-center w-16 h-16 rounded-full bg-sky-500 text-white hover:bg-sky-400 transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-sky-500/30"
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7 fill-white" />
                  ) : (
                    <Play className="w-7 h-7 fill-white ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => void nextTrack()}
                  aria-label="Next track"
                  className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-xl text-[#F8FAFC] hover:bg-[#13131D]"
                >
                  <SkipForward className="w-6 h-6" />
                </button>

                <button
                  type="button"
                  onClick={cycleRepeat}
                  aria-label={`Cycle repeat mode (current: ${repeat})`}
                  className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors ${
                    repeat !== 'off'
                      ? 'text-sky-400 bg-sky-500/15'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  {repeat === 'one' ? (
                    <Repeat1 className="w-5 h-5" />
                  ) : (
                    <Repeat className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Source & License Attribution Block */}
              <div className="rounded-2xl border border-[#1C1C2E] bg-[#0A0A10] p-5 space-y-2.5 text-xs shadow-lg">
                <div className="flex items-center justify-between text-[#F8FAFC]">
                  <span className="flex items-center gap-2 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                    {currentTrack.provider === 'local'
                      ? 'Local Device Media'
                      : `${currentTrack.licenseType} · Jamendo Attribution`}
                  </span>
                  {isPlayingFromOfflineCache && (
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <WifiOff className="w-3.5 h-3.5" />
                      Offline Cache
                    </span>
                  )}
                </div>
                {currentTrack.provider === 'local' ? (
                  <p className="text-[#94A3B8]">
                    Imported by user · Stored securely in IndexedDB for offline playback
                  </p>
                ) : (
                  <>
                    <p className="text-[#94A3B8]">
                      Artist: {currentTrack.artistName} · Source: Jamendo Music
                    </p>
                    <div className="flex flex-wrap items-center gap-4 pt-1">
                      <a
                        href={currentTrack.originalTrackUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sky-400 hover:underline underline-offset-4 font-medium"
                      >
                        Original Jamendo Page
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <a
                        href={currentTrack.licenseUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#94A3B8] hover:text-white underline underline-offset-4"
                      >
                        View Licence Deed
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Player Bar */}
      <div
        role="region"
        aria-label="Global music player"
        className="fixed bottom-13 md:bottom-0 left-0 right-0 z-30 border-t border-[#1C1C2E] bg-[#0A0A10]/95 backdrop-blur-md"
      >
        {/* Top thin progress bar on mobile */}
        <div className="md:hidden h-1 w-full bg-[#1C1C2E]">
          <div
            className="h-full bg-sky-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="mx-auto flex h-14 md:h-[80px] items-center justify-between gap-4 px-4 md:px-8">
          {/* Left: Track info */}
          <div className="flex items-center gap-3.5 min-w-0 md:w-1/3">
            <button
              type="button"
              onClick={() => setFullScreen(true)}
              aria-label="Expand full screen player"
              className="flex items-center gap-3.5 min-w-0 text-left rounded-xl group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <ArtworkImage
                src={currentTrack.artworkUrl}
                alt={currentTrack.title}
                className="w-11 h-11 md:w-13 md:h-13 rounded-xl shadow-md transition-transform group-hover:scale-105"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#F8FAFC]">
                  {currentTrack.title}
                </p>
                <p className="truncate text-xs text-[#94A3B8]">
                  {currentTrack.artistName}
                  <span className="hidden sm:inline">
                    {' '}
                    · {currentTrack.licenseType}
                  </span>
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => void toggleFavorite(currentTrack)}
              aria-label={
                favorited ? 'Unfavorite current track' : 'Favorite current track'
              }
              className="hidden sm:flex min-w-[36px] min-h-[36px] items-center justify-center rounded-xl text-[#94A3B8] hover:text-sky-400 transition-colors"
            >
              <Heart
                className={`w-4 h-4 ${
                  favorited ? 'fill-sky-400 text-sky-400' : ''
                }`}
              />
            </button>
          </div>

          {/* Center: Controls & Seek (Desktop) */}
          <div className="hidden md:flex flex-col items-center justify-center gap-1.5 w-1/3 max-w-lg">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={toggleShuffle}
                aria-label="Shuffle"
                aria-pressed={shuffle}
                className={`p-1.5 rounded-lg transition-colors ${
                  shuffle
                    ? 'text-sky-400'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => void previousTrack()}
                aria-label="Previous track"
                className="p-1.5 rounded-lg text-[#F8FAFC] hover:opacity-70 transition-opacity"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => void togglePlay()}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-sky-500 text-white hover:bg-sky-400 transition-transform hover:scale-105 active:scale-95 shadow-md shadow-sky-500/25"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-white" />
                ) : (
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => void nextTrack()}
                aria-label="Next track"
                className="p-1.5 rounded-lg text-[#F8FAFC] hover:opacity-70 transition-opacity"
              >
                <SkipForward className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={cycleRepeat}
                aria-label={`Repeat (${repeat})`}
                className={`p-1.5 rounded-lg transition-colors ${
                  repeat !== 'off'
                    ? 'text-sky-400'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {repeat === 'one' ? (
                  <Repeat1 className="w-4 h-4" />
                ) : (
                  <Repeat className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="flex w-full items-center gap-2.5">
              <span className="text-[11px] font-mono-tabular text-[#94A3B8] w-9 text-right">
                {formatDuration(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 1}
                step={0.5}
                value={Math.min(currentTime, duration || 1)}
                onChange={(e) => seek(Number(e.target.value))}
                aria-label="Playback progress"
                className="flex-1 accent-sky-500 h-1.5 bg-[#1C1C2E] rounded-full cursor-pointer"
              />
              <span className="text-[11px] font-mono-tabular text-[#94A3B8] w-9">
                {formatDuration(duration)}
              </span>
            </div>
          </div>

          {/* Right: Volume, Queue, Expand (Desktop) + Quick Play/Expand (Mobile) */}
          <div className="flex items-center justify-end gap-2.5 md:w-1/3">
            <div className="hidden lg:flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setVolume(volume > 0 ? 0 : 0.85)}
                aria-label={volume === 0 ? 'Unmute volume' : 'Mute volume'}
                className="p-1.5 text-[#94A3B8] hover:text-white"
              >
                {volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Audio volume"
                className="w-20 accent-sky-500 h-1.5 bg-[#1C1C2E] rounded-full cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={() => setQueueOpen(!isQueueOpen)}
              aria-label="Toggle playback queue"
              className={`hidden md:flex min-w-[36px] min-h-[36px] items-center justify-center rounded-xl transition-colors ${
                isQueueOpen
                  ? 'text-sky-400 bg-sky-500/15'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#13131D]'
              }`}
            >
              <ListMusic className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => void togglePlay()}
              aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
              className="md:hidden min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full bg-sky-500 text-white shadow-md shadow-sky-500/25"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-white" />
              ) : (
                <Play className="w-4 h-4 fill-white ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setFullScreen(true)}
              aria-label="Open full screen player"
              className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#13131D] transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
