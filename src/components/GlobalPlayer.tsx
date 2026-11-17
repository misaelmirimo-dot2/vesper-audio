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
          className="fixed bottom-32 md:bottom-24 right-4 left-4 sm:left-auto z-50 flex items-center justify-between gap-3 rounded-xl bg-[#2A181B] border border-rose-500/40 px-4 py-3 text-xs text-rose-100 shadow-2xl"
        >
          <span>{playbackError}</span>
          <button
            type="button"
            onClick={clearError}
            aria-label="Dismiss playback error"
            className="min-w-[32px] min-h-[32px] flex items-center justify-center text-rose-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Queue Side Drawer */}
      {isQueueOpen && (
        <aside
          aria-label="Playback Queue"
          className="fixed bottom-[126px] md:bottom-[92px] right-3 left-3 sm:left-auto sm:right-4 z-40 sm:w-80 max-h-[420px] flex flex-col rounded-2xl bg-[#242424] border border-white/10 shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h3 className="text-sm font-bold text-white">
              Queue ({queue.length})
            </h3>
            <button
              type="button"
              onClick={() => setQueueOpen(false)}
              aria-label="Close playback queue"
              className="min-w-[36px] min-h-[36px] flex items-center justify-center text-[#B3B3B3] hover:text-white rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {queue.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${
                  idx === currentIndex ? 'bg-white/10' : 'hover:bg-white/5'
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
                    className="w-10 h-10 rounded-md"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-xs font-semibold ${
                        idx === currentIndex ? 'text-[#1ED760]' : 'text-white'
                      }`}
                    >
                      {item.title}
                    </p>
                    <p className="truncate text-[11px] text-[#B3B3B3]">
                      {item.artistName}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => removeFromQueue(idx)}
                  aria-label={`Remove ${item.title} from queue`}
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center text-[#B3B3B3] hover:text-rose-400 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* Full-Screen Spotify iOS Now Playing Sheet */}
      {isFullScreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full screen music player"
          className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#173322] via-[#121212] to-black overflow-y-auto pb-safe"
        >
          <header className="flex items-center justify-between px-4 sm:px-6 pt-3 pb-2">
            <button
              type="button"
              onClick={() => setFullScreen(false)}
              aria-label="Minimize full screen player"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
            <div className="text-center min-w-0 px-2">
              <p className="text-[11px] font-semibold tracking-wider text-[#B3B3B3] uppercase">
                Playing From Album
              </p>
              <p className="text-xs font-bold text-white truncate max-w-[210px] sm:max-w-xs">
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
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors"
            >
              <ListMusic className="w-5 h-5" />
            </button>
          </header>

          <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 px-6 py-4 sm:py-8">
            {/* Large Square Album Art */}
            <div className="w-full max-w-[320px] sm:max-w-[360px]">
              <ArtworkImage
                src={currentTrack.artworkUrl}
                alt={`${currentTrack.title} album cover`}
                className="w-full aspect-square rounded-xl shadow-[0_24px_60px_rgba(0,0,0,0.75)]"
              />
            </div>

            <div className="w-full max-w-md space-y-6">
              {/* Track Title, Artist & Green Heart */}
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-white truncate">
                    {currentTrack.title}
                  </h2>
                  <p className="mt-1 text-sm text-[#B3B3B3] truncate">
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
                  className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-transform active:scale-90 ${
                    favorited ? 'text-[#1ED760]' : 'text-[#B3B3B3] hover:text-white'
                  }`}
                >
                  <Heart
                    className={`w-6 h-6 ${
                      favorited ? 'fill-[#1ED760] text-[#1ED760]' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Spotify Scrubbable Seek Bar */}
              <div>
                <input
                  type="range"
                  min={0}
                  max={duration || 1}
                  step={0.5}
                  value={Math.min(currentTime, duration || 1)}
                  onChange={(e) => seek(Number(e.target.value))}
                  aria-label="Seek audio position"
                  className="w-full accent-white hover:accent-[#1ED760] cursor-pointer h-1.5 bg-white/20 rounded-full"
                />
                <div className="mt-2 flex items-center justify-between text-xs font-mono-tabular text-[#B3B3B3]">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(duration)}</span>
                </div>
              </div>

              {/* Spotify Transport Row */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={toggleShuffle}
                  aria-label="Toggle shuffle"
                  aria-pressed={shuffle}
                  className={`relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors ${
                    shuffle
                      ? 'text-[#1ED760]'
                      : 'text-[#B3B3B3] hover:text-white'
                  }`}
                >
                  <Shuffle className="w-5 h-5" />
                  {shuffle && (
                    <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-[#1ED760]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => void previousTrack()}
                  aria-label="Previous track"
                  className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full text-white hover:bg-white/10 active:scale-90 transition-all"
                >
                  <SkipBack className="w-7 h-7 fill-white" />
                </button>

                <button
                  type="button"
                  onClick={() => void togglePlay()}
                  aria-label={isPlaying ? 'Pause playback' : 'Start playback'}
                  className="flex items-center justify-center w-16 h-16 rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-transform shadow-xl"
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7 fill-black" />
                  ) : (
                    <Play className="w-7 h-7 fill-black ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => void nextTrack()}
                  aria-label="Next track"
                  className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full text-white hover:bg-white/10 active:scale-90 transition-all"
                >
                  <SkipForward className="w-7 h-7 fill-white" />
                </button>

                <button
                  type="button"
                  onClick={cycleRepeat}
                  aria-label={`Cycle repeat mode (current: ${repeat})`}
                  className={`relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors ${
                    repeat !== 'off'
                      ? 'text-[#1ED760]'
                      : 'text-[#B3B3B3] hover:text-white'
                  }`}
                >
                  {repeat === 'one' ? (
                    <Repeat1 className="w-5 h-5" />
                  ) : (
                    <Repeat className="w-5 h-5" />
                  )}
                  {repeat !== 'off' && (
                    <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-[#1ED760]" />
                  )}
                </button>
              </div>

              {/* Source & License Attribution Card */}
              <div className="rounded-xl bg-[#181818] border border-white/10 p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between text-white">
                  <span className="flex items-center gap-2 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-[#1ED760]" />
                    {currentTrack.provider === 'local'
                      ? 'Local Device Media'
                      : `${currentTrack.licenseType} · Jamendo Attribution`}
                  </span>
                  {isPlayingFromOfflineCache && (
                    <span className="flex items-center gap-1 text-[#1ED760] font-semibold">
                      <WifiOff className="w-3.5 h-3.5" />
                      Offline
                    </span>
                  )}
                </div>
                {currentTrack.provider === 'local' ? (
                  <p className="text-[#B3B3B3]">
                    Imported by user · Stored privately on this device
                  </p>
                ) : (
                  <>
                    <p className="text-[#B3B3B3]">
                      Artist: {currentTrack.artistName} · Source: Jamendo Music
                    </p>
                    <div className="flex flex-wrap items-center gap-4 pt-1">
                      <a
                        href={currentTrack.originalTrackUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#1ED760] hover:underline underline-offset-4 font-medium"
                      >
                        Original Jamendo Page
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <a
                        href={currentTrack.licenseUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#B3B3B3] hover:text-white underline underline-offset-4"
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

      {/* Subtle Spotify iOS bottom scrim behind floating mini-player */}
      <div
        aria-hidden="true"
        className="md:hidden pointer-events-none fixed bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black via-black/60 to-transparent z-20"
      />

      {/* Mobile Floating Mini-Player (Authentic Spotify iOS Floating Bar) */}
      <div
        role="region"
        aria-label="Mobile mini music player"
        className="md:hidden fixed bottom-[60px] left-2 right-2 z-30 rounded-lg bg-[#282828]/95 backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.65)] overflow-hidden border border-white/[0.08]"
      >
        <div className="flex h-14 items-center justify-between gap-2 px-2.5">
          <button
            type="button"
            onClick={() => setFullScreen(true)}
            aria-label="Expand full screen player"
            className="flex items-center gap-3 min-w-0 flex-1 text-left"
          >
            <ArtworkImage
              src={currentTrack.artworkUrl}
              alt={currentTrack.title}
              className="w-10 h-10 rounded-md shadow-sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white">
                {currentTrack.title}
              </p>
              <p className="truncate text-[11px] text-[#B3B3B3]">
                {currentTrack.artistName}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => void toggleFavorite(currentTrack)}
              aria-label={
                favorited ? 'Unfavorite current track' : 'Favorite current track'
              }
              className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full ${
                favorited ? 'text-[#1ED760]' : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              <Heart
                className={`w-5 h-5 ${
                  favorited ? 'fill-[#1ED760] text-[#1ED760]' : ''
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => void togglePlay()}
              aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-white active:scale-90 transition-transform"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-white" />
              ) : (
                <Play className="w-5 h-5 fill-white ml-0.5" />
              )}
            </button>
          </div>
        </div>

        {/* Thin 2px progress bar along bottom edge of Spotify mini-player */}
        <div className="h-[2px] w-full bg-white/15">
          <div
            className="h-full bg-white transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Desktop Bottom Spotify Player Bar */}
      <div
        role="region"
        aria-label="Global music player"
        className="hidden md:block fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-black px-4 lg:px-6"
      >
        <div className="mx-auto flex h-[84px] items-center justify-between gap-4">
          {/* Left: Track info */}
          <div className="flex items-center gap-3.5 min-w-0 w-1/3">
            <button
              type="button"
              onClick={() => setFullScreen(true)}
              aria-label="Expand full screen player"
              className="flex items-center gap-3.5 min-w-0 text-left rounded-md group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1ED760]"
            >
              <ArtworkImage
                src={currentTrack.artworkUrl}
                alt={currentTrack.title}
                className="w-14 h-14 rounded-md shadow-md transition-transform group-hover:scale-105"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white hover:underline">
                  {currentTrack.title}
                </p>
                <p className="truncate text-xs text-[#B3B3B3]">
                  {currentTrack.artistName}
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => void toggleFavorite(currentTrack)}
              aria-label={
                favorited ? 'Unfavorite current track' : 'Favorite current track'
              }
              className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full transition-colors ${
                favorited ? 'text-[#1ED760]' : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              <Heart
                className={`w-4 h-4 ${
                  favorited ? 'fill-[#1ED760] text-[#1ED760]' : ''
                }`}
              />
            </button>
          </div>

          {/* Center: Controls & Seek */}
          <div className="flex flex-col items-center justify-center gap-1.5 w-1/3 max-w-lg">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={toggleShuffle}
                aria-label="Shuffle"
                aria-pressed={shuffle}
                className={`p-1.5 rounded-full transition-colors ${
                  shuffle
                    ? 'text-[#1ED760]'
                    : 'text-[#B3B3B3] hover:text-white'
                }`}
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => void previousTrack()}
                aria-label="Previous track"
                className="p-1.5 rounded-full text-[#B3B3B3] hover:text-white transition-colors"
              >
                <SkipBack className="w-4 h-4 fill-current" />
              </button>
              <button
                type="button"
                onClick={() => void togglePlay()}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-transform"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-black" />
                ) : (
                  <Play className="w-4 h-4 fill-black ml-0.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => void nextTrack()}
                aria-label="Next track"
                className="p-1.5 rounded-full text-[#B3B3B3] hover:text-white transition-colors"
              >
                <SkipForward className="w-4 h-4 fill-current" />
              </button>
              <button
                type="button"
                onClick={cycleRepeat}
                aria-label={`Repeat (${repeat})`}
                className={`p-1.5 rounded-full transition-colors ${
                  repeat !== 'off'
                    ? 'text-[#1ED760]'
                    : 'text-[#B3B3B3] hover:text-white'
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
              <span className="text-[11px] font-mono-tabular text-[#B3B3B3] w-9 text-right">
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
                className="flex-1 accent-[#1ED760] h-1 bg-white/20 rounded-full cursor-pointer"
              />
              <span className="text-[11px] font-mono-tabular text-[#B3B3B3] w-9">
                {formatDuration(duration)}
              </span>
            </div>
          </div>

          {/* Right: Volume, Queue, Expand */}
          <div className="flex items-center justify-end gap-2 w-1/3">
            <div className="hidden lg:flex items-center gap-2">
              <button
                type="button"
                onClick={() => setVolume(volume > 0 ? 0 : 0.85)}
                aria-label={volume === 0 ? 'Unmute volume' : 'Mute volume'}
                className="p-1.5 text-[#B3B3B3] hover:text-white"
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
                className="w-20 accent-[#1ED760] h-1 bg-white/20 rounded-full cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={() => setQueueOpen(!isQueueOpen)}
              aria-label="Toggle playback queue"
              className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full transition-colors ${
                isQueueOpen
                  ? 'text-[#1ED760]'
                  : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              <ListMusic className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setFullScreen(true)}
              aria-label="Open full screen player"
              className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full text-[#B3B3B3] hover:text-white transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
