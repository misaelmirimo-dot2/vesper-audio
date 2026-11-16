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
          className="fixed bottom-24 md:bottom-20 right-4 z-50 flex items-center gap-3 rounded-lg border border-rose-500/40 bg-[#1B1216] px-4 py-2.5 text-xs text-rose-200 shadow-xl"
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
          className="fixed bottom-[76px] right-4 z-40 w-80 max-w-[calc(100vw-2rem)] max-h-[420px] flex flex-col rounded-xl border border-[#262632] bg-[#15151B] shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-[#262632] px-4 py-3">
            <h3 className="text-sm font-semibold text-[#F5F5F7]">
              Up Next ({queue.length})
            </h3>
            <button
              type="button"
              onClick={() => setQueueOpen(false)}
              aria-label="Close playback queue"
              className="p-1.5 text-[#9494A3] hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-[#1E1E28] p-2">
            {queue.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                className={`flex items-center gap-2.5 rounded-lg px-2 py-2 ${
                  idx === currentIndex ? 'bg-violet-500/10' : 'hover:bg-[#1C1C24]'
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
                    className="w-9 h-9 rounded-md"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-xs font-medium ${
                        idx === currentIndex
                          ? 'text-violet-400'
                          : 'text-[#F5F5F7]'
                      }`}
                    >
                      {item.title}
                    </p>
                    <p className="truncate text-[11px] text-[#9494A3]">
                      {item.artistName}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => removeFromQueue(idx)}
                  aria-label={`Remove ${item.title} from queue`}
                  className="p-1.5 text-[#666678] hover:text-rose-400"
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
          className="fixed inset-0 z-50 flex flex-col bg-[#0E0E12] overflow-y-auto"
        >
          <header className="flex items-center justify-between px-5 py-4 border-b border-[#1E1E28]">
            <button
              type="button"
              onClick={() => setFullScreen(false)}
              aria-label="Minimize full screen player"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-[#9494A3] hover:text-white hover:bg-[#1C1C24]"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
            <div className="text-center">
              <p className="text-xs font-medium text-[#9494A3]">Now Playing</p>
              <p className="text-xs text-[#F5F5F7] truncate max-w-[200px]">
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
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-[#9494A3] hover:text-white hover:bg-[#1C1C24]"
            >
              <ListMusic className="w-5 h-5" />
            </button>
          </header>

          <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col lg:flex-row items-center justify-center gap-10 px-6 py-8">
            <div className="w-full max-w-sm">
              <ArtworkImage
                src={currentTrack.artworkUrl}
                alt={`${currentTrack.title} album cover`}
                className="w-full aspect-square rounded-2xl border border-[#262632] shadow-2xl"
              />
            </div>

            <div className="w-full max-w-md space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-2xl font-bold text-[#F5F5F7] truncate">
                    {currentTrack.title}
                  </h2>
                  <p className="mt-1 text-sm text-[#9494A3]">
                    {currentTrack.provider === 'local' ? (
                      <span>{currentTrack.artistName}</span>
                    ) : (
                      <Link
                        to={`/artist/${currentTrack.artistId}`}
                        onClick={() => setFullScreen(false)}
                        className="hover:text-white underline-offset-4 hover:underline"
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
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-[#9494A3] hover:text-violet-400"
                >
                  <Heart
                    className={`w-5 h-5 ${
                      favorited ? 'fill-violet-400 text-violet-400' : ''
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
                  className="w-full accent-violet-500 cursor-pointer h-1.5 bg-[#262632] rounded-lg"
                />
                <div className="mt-2 flex items-center justify-between text-xs font-mono-tabular text-[#9494A3]">
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
                  className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors ${
                    shuffle
                      ? 'text-violet-400 bg-violet-500/10'
                      : 'text-[#9494A3] hover:text-white'
                  }`}
                >
                  <Shuffle className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => void previousTrack()}
                  aria-label="Previous track"
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-[#F5F5F7] hover:bg-[#1C1C24]"
                >
                  <SkipBack className="w-6 h-6" />
                </button>

                <button
                  type="button"
                  onClick={() => void togglePlay()}
                  aria-label={isPlaying ? 'Pause playback' : 'Start playback'}
                  className="flex items-center justify-center w-14 h-14 rounded-full bg-violet-600 text-white hover:bg-violet-500 transition-colors shadow-lg"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 fill-white" />
                  ) : (
                    <Play className="w-6 h-6 fill-white ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => void nextTrack()}
                  aria-label="Next track"
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-[#F5F5F7] hover:bg-[#1C1C24]"
                >
                  <SkipForward className="w-6 h-6" />
                </button>

                <button
                  type="button"
                  onClick={cycleRepeat}
                  aria-label={`Cycle repeat mode (current: ${repeat})`}
                  className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors ${
                    repeat !== 'off'
                      ? 'text-violet-400 bg-violet-500/10'
                      : 'text-[#9494A3] hover:text-white'
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
              <div className="rounded-xl border border-[#262632] bg-[#15151B] p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between text-[#F5F5F7]">
                  <span className="flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="w-4 h-4 text-violet-400" />
                    {currentTrack.provider === 'local'
                      ? 'Local Device Media'
                      : `${currentTrack.licenseType} · Jamendo Attribution`}
                  </span>
                  {isPlayingFromOfflineCache && (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <WifiOff className="w-3.5 h-3.5" />
                      Offline Cache
                    </span>
                  )}
                </div>
                {currentTrack.provider === 'local' ? (
                  <p className="text-[#9494A3]">
                    Imported by user · Stored in IndexedDB for offline playback
                  </p>
                ) : (
                  <>
                    <p className="text-[#9494A3]">
                      Artist: {currentTrack.artistName} · Source: Jamendo Music
                    </p>
                    <div className="flex flex-wrap items-center gap-4 pt-1">
                      <a
                        href={currentTrack.originalTrackUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-violet-400 hover:text-violet-300 underline underline-offset-4"
                      >
                        Original Jamendo Page
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <a
                        href={currentTrack.licenseUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#9494A3] hover:text-white underline underline-offset-4"
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

      {/* Persistent Bottom Player Bar (Desktop + Mobile Mini-Player) */}
      <div
        role="region"
        aria-label="Global music player"
        className="fixed bottom-12 md:bottom-0 left-0 right-0 z-30 border-t border-[#262632] bg-[#13131A]/95 backdrop-blur-md"
      >
        {/* Top thin progress bar on mobile */}
        <div className="md:hidden h-0.5 w-full bg-[#262632]">
          <div
            className="h-full bg-violet-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="mx-auto flex h-13 md:h-[76px] items-center justify-between gap-3 px-3 md:px-6">
          {/* Left: Track info */}
          <div className="flex items-center gap-3 min-w-0 md:w-1/3">
            <button
              type="button"
              onClick={() => setFullScreen(true)}
              aria-label="Expand full screen player"
              className="flex items-center gap-3 min-w-0 text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <ArtworkImage
                src={currentTrack.artworkUrl}
                alt={currentTrack.title}
                className="w-10 h-10 md:w-12 md:h-12 rounded-lg"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#F5F5F7]">
                  {currentTrack.title}
                </p>
                <p className="truncate text-xs text-[#9494A3]">
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
              className="hidden sm:flex min-w-[36px] min-h-[36px] items-center justify-center rounded-lg text-[#9494A3] hover:text-violet-400"
            >
              <Heart
                className={`w-4 h-4 ${
                  favorited ? 'fill-violet-400 text-violet-400' : ''
                }`}
              />
            </button>
          </div>

          {/* Center: Controls & Seek (Desktop) */}
          <div className="hidden md:flex flex-col items-center justify-center gap-1.5 w-1/3 max-w-lg">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleShuffle}
                aria-label="Shuffle"
                aria-pressed={shuffle}
                className={`p-1.5 rounded-md transition-colors ${
                  shuffle
                    ? 'text-violet-400'
                    : 'text-[#9494A3] hover:text-white'
                }`}
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => void previousTrack()}
                aria-label="Previous track"
                className="p-1.5 rounded-md text-[#D4D4DF] hover:text-white"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => void togglePlay()}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-violet-600 text-white hover:bg-violet-500 transition-colors"
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
                className="p-1.5 rounded-md text-[#D4D4DF] hover:text-white"
              >
                <SkipForward className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={cycleRepeat}
                aria-label={`Repeat (${repeat})`}
                className={`p-1.5 rounded-md transition-colors ${
                  repeat !== 'off'
                    ? 'text-violet-400'
                    : 'text-[#9494A3] hover:text-white'
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
              <span className="text-[11px] font-mono-tabular text-[#9494A3] w-9 text-right">
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
                className="flex-1 accent-violet-500 h-1 bg-[#262632] rounded-lg cursor-pointer"
              />
              <span className="text-[11px] font-mono-tabular text-[#9494A3] w-9">
                {formatDuration(duration)}
              </span>
            </div>
          </div>

          {/* Right: Volume, Queue, Expand (Desktop) + Quick Play/Expand (Mobile) */}
          <div className="flex items-center justify-end gap-2 md:w-1/3">
            <div className="hidden lg:flex items-center gap-2">
              <button
                type="button"
                onClick={() => setVolume(volume > 0 ? 0 : 0.85)}
                aria-label={volume === 0 ? 'Unmute volume' : 'Mute volume'}
                className="p-1.5 text-[#9494A3] hover:text-white"
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
                className="w-20 accent-violet-500 h-1 bg-[#262632] rounded-lg cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={() => setQueueOpen(!isQueueOpen)}
              aria-label="Toggle playback queue"
              className={`hidden md:flex min-w-[36px] min-h-[36px] items-center justify-center rounded-lg transition-colors ${
                isQueueOpen
                  ? 'text-violet-400 bg-violet-500/10'
                  : 'text-[#9494A3] hover:text-white'
              }`}
            >
              <ListMusic className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => void togglePlay()}
              aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
              className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-white"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-white" />
              ) : (
                <Play className="w-5 h-5 fill-white" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setFullScreen(true)}
              aria-label="Open full screen player"
              className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[#9494A3] hover:text-white"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
