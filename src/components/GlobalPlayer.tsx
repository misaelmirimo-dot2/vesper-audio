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
          className="fixed bottom-24 md:bottom-20 right-4 z-50 flex items-center gap-3 rounded-xl border border-rose-500/40 bg-[var(--bg-surface)] px-4 py-2.5 text-xs text-rose-500 shadow-2xl"
        >
          <span>{playbackError}</span>
          <button
            type="button"
            onClick={clearError}
            aria-label="Dismiss playback error"
            className="text-rose-500 hover:opacity-80"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Queue Side Drawer */}
      {isQueueOpen && (
        <aside
          aria-label="Playback Queue"
          className="fixed bottom-[76px] right-4 z-40 w-80 max-w-[calc(100vw-2rem)] max-h-[420px] flex flex-col rounded-2xl border border-[var(--border-hairline)] liquid-glass shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-[var(--border-hairline)] px-4 py-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Up Next ({queue.length})
            </h3>
            <button
              type="button"
              onClick={() => setQueueOpen(false)}
              aria-label="Close playback queue"
              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-hairline)] p-2">
            {queue.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors ${
                  idx === currentIndex
                    ? 'bg-[#fa233b]/10 text-[#fa233b]'
                    : 'hover:bg-black/5 dark:hover:bg-white/5'
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
                          ? 'text-[#fa233b] font-semibold'
                          : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {item.title}
                    </p>
                    <p className="truncate text-[11px] text-[var(--text-secondary)]">
                      {item.artistName}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => removeFromQueue(idx)}
                  aria-label={`Remove ${item.title} from queue`}
                  className="p-1.5 text-[var(--text-secondary)] hover:text-rose-500 rounded-lg"
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
          className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-canvas)] overflow-y-auto animate-fade-in"
        >
          <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-hairline)] liquid-glass">
            <button
              type="button"
              onClick={() => setFullScreen(false)}
              aria-label="Minimize full screen player"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
            <div className="text-center">
              <p className="text-xs font-medium text-[var(--text-secondary)]">Now Playing</p>
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate max-w-[220px]">
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
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <ListMusic className="w-5 h-5" />
            </button>
          </header>

          <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col lg:flex-row items-center justify-center gap-12 px-6 py-10">
            <div className="w-full max-w-sm">
              <ArtworkImage
                src={currentTrack.artworkUrl}
                alt={`${currentTrack.title} album cover`}
                className="w-full aspect-square rounded-3xl border border-[var(--border-hairline)] shadow-2xl shadow-black/20"
              />
            </div>

            <div className="w-full max-w-md space-y-7">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] truncate">
                    {currentTrack.title}
                  </h2>
                  <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
                    {currentTrack.provider === 'local' ? (
                      <span>{currentTrack.artistName}</span>
                    ) : (
                      <Link
                        to={`/artist/${currentTrack.artistId}`}
                        onClick={() => setFullScreen(false)}
                        className="hover:text-[var(--text-primary)] underline-offset-4 hover:underline font-medium"
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
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:text-[#fa233b] transition-colors"
                >
                  <Heart
                    className={`w-5 h-5 ${
                      favorited ? 'fill-[#fa233b] text-[#fa233b]' : ''
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
                  className="w-full accent-[#fa233b] cursor-pointer h-2 bg-[var(--border-hairline)] rounded-full transition-all"
                />
                <div className="mt-2.5 flex items-center justify-between text-xs font-mono-tabular text-[var(--text-secondary)]">
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
                  className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl transition-colors ${
                    shuffle
                      ? 'text-[#fa233b] bg-[#fa233b]/10'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Shuffle className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => void previousTrack()}
                  aria-label="Previous track"
                  className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-2xl text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  <SkipBack className="w-6 h-6" />
                </button>

                <button
                  type="button"
                  onClick={() => void togglePlay()}
                  aria-label={isPlaying ? 'Pause playback' : 'Start playback'}
                  className="flex items-center justify-center w-16 h-16 rounded-full bg-[#fa233b] text-white hover:bg-[#e01e33] transition-transform hover:scale-105 active:scale-95 shadow-xl shadow-[#fa233b]/30"
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
                  className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-2xl text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  <SkipForward className="w-6 h-6" />
                </button>

                <button
                  type="button"
                  onClick={cycleRepeat}
                  aria-label={`Cycle repeat mode (current: ${repeat})`}
                  className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl transition-colors ${
                    repeat !== 'off'
                      ? 'text-[#fa233b] bg-[#fa233b]/10'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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
              <div className="rounded-2xl border border-[var(--border-hairline)] liquid-glass-card p-5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-[var(--text-primary)]">
                  <span className="flex items-center gap-2 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-[#fa233b]" />
                    {currentTrack.provider === 'local'
                      ? 'Local Device Media'
                      : `${currentTrack.licenseType} · Jamendo Attribution`}
                  </span>
                  {isPlayingFromOfflineCache && (
                    <span className="flex items-center gap-1 text-emerald-500 font-medium">
                      <WifiOff className="w-3.5 h-3.5" />
                      Offline Cache
                    </span>
                  )}
                </div>
                {currentTrack.provider === 'local' ? (
                  <p className="text-[var(--text-secondary)]">
                    Imported by user · Stored securely in IndexedDB for offline playback
                  </p>
                ) : (
                  <>
                    <p className="text-[var(--text-secondary)]">
                      Artist: {currentTrack.artistName} · Source: Jamendo Music
                    </p>
                    <div className="flex flex-wrap items-center gap-4 pt-1">
                      <a
                        href={currentTrack.originalTrackUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#fa233b] hover:underline underline-offset-4 font-medium"
                      >
                        Original Jamendo Page
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <a
                        href={currentTrack.licenseUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-4"
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

      {/* Persistent Bottom Player Bar with Liquid Glass */}
      <div
        role="region"
        aria-label="Global music player"
        className="fixed bottom-13 md:bottom-0 left-0 right-0 z-30 border-t border-[var(--border-hairline)] liquid-glass"
      >
        {/* Top thin progress bar on mobile */}
        <div className="md:hidden h-1 w-full bg-[var(--border-hairline)]">
          <div
            className="h-full bg-[#fa233b] transition-all"
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
              className="flex items-center gap-3.5 min-w-0 text-left rounded-xl group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fa233b]"
            >
              <ArtworkImage
                src={currentTrack.artworkUrl}
                alt={currentTrack.title}
                className="w-11 h-11 md:w-13 md:h-13 rounded-xl shadow-md transition-transform group-hover:scale-105"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                  {currentTrack.title}
                </p>
                <p className="truncate text-xs text-[var(--text-secondary)]">
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
              className="hidden sm:flex min-w-[36px] min-h-[36px] items-center justify-center rounded-xl text-[var(--text-secondary)] hover:text-[#fa233b] transition-colors"
            >
              <Heart
                className={`w-4 h-4 ${
                  favorited ? 'fill-[#fa233b] text-[#fa233b]' : ''
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
                    ? 'text-[#fa233b]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => void previousTrack()}
                aria-label="Previous track"
                className="p-1.5 rounded-lg text-[var(--text-primary)] hover:opacity-70 transition-opacity"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => void togglePlay()}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-[#fa233b] text-white hover:bg-[#e01e33] transition-transform hover:scale-105 active:scale-95 shadow-md shadow-[#fa233b]/25"
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
                className="p-1.5 rounded-lg text-[var(--text-primary)] hover:opacity-70 transition-opacity"
              >
                <SkipForward className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={cycleRepeat}
                aria-label={`Repeat (${repeat})`}
                className={`p-1.5 rounded-lg transition-colors ${
                  repeat !== 'off'
                    ? 'text-[#fa233b]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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
              <span className="text-[11px] font-mono-tabular text-[var(--text-secondary)] w-9 text-right">
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
                className="flex-1 accent-[#fa233b] h-1.5 bg-[var(--border-hairline)] rounded-full cursor-pointer"
              />
              <span className="text-[11px] font-mono-tabular text-[var(--text-secondary)] w-9">
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
                className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
                className="w-20 accent-[#fa233b] h-1.5 bg-[var(--border-hairline)] rounded-full cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={() => setQueueOpen(!isQueueOpen)}
              aria-label="Toggle playback queue"
              className={`hidden md:flex min-w-[36px] min-h-[36px] items-center justify-center rounded-xl transition-colors ${
                isQueueOpen
                  ? 'text-[#fa233b] bg-[#fa233b]/10'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              <ListMusic className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => void togglePlay()}
              aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
              className="md:hidden min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full bg-[#fa233b] text-white shadow-md"
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
              className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
