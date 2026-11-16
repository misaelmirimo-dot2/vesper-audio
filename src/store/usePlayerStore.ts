import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NormalizedTrack } from '../types/music.ts';
import { audioEngine } from '../lib/audioEngine.ts';
import {
  getNextQueueIndex,
  getPreviousQueueIndex,
  type RepeatMode,
} from '../utils/playerLogic.ts';

interface PlayerState {
  queue: NormalizedTrack[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  repeat: RepeatMode;
  shuffle: boolean;
  isFullScreen: boolean;
  isQueueOpen: boolean;
  isPlayingFromOfflineCache: boolean;
  playbackError: string | null;
  playTrack: (track: NormalizedTrack, queueTracks?: NormalizedTrack[]) => Promise<void>;
  togglePlay: () => Promise<void>;
  pausePlayback: () => void;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (track: NormalizedTrack) => void;
  removeFromQueue: (index: number) => void;
  setFullScreen: (open: boolean) => void;
  setQueueOpen: (open: boolean) => void;
  clearError: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      queue: [],
      currentIndex: -1,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 0.85,
      repeat: 'off',
      shuffle: false,
      isFullScreen: false,
      isQueueOpen: false,
      isPlayingFromOfflineCache: false,
      playbackError: null,

      playTrack: async (track, queueTracks) => {
        const state = get();
        let nextQueue = state.queue;
        let nextIndex = -1;

        if (queueTracks && queueTracks.length > 0) {
          nextQueue = queueTracks;
          nextIndex = queueTracks.findIndex((t) => t.id === track.id);
          if (nextIndex === -1) {
            nextQueue = [track, ...queueTracks];
            nextIndex = 0;
          }
        } else {
          const existingIdx = state.queue.findIndex((t) => t.id === track.id);
          if (existingIdx !== -1) {
            nextIndex = existingIdx;
          } else {
            nextQueue = [...state.queue, track];
            nextIndex = nextQueue.length - 1;
          }
        }

        set({
          queue: nextQueue,
          currentIndex: nextIndex,
          currentTime: 0,
          duration: track.duration || 0,
          playbackError: null,
        });

        const res = await audioEngine.loadAndPlay(track, get().volume);
        set({ isPlayingFromOfflineCache: res.isOfflineCached });
      },

      togglePlay: async () => {
        const state = get();
        const current = state.queue[state.currentIndex];
        if (!current) return;

        if (state.isPlaying) {
          audioEngine.pause();
          set({ isPlaying: false });
        } else {
          if (audioEngine.getCurrentTrackId() !== current.id) {
            const res = await audioEngine.loadAndPlay(current, state.volume);
            set({ isPlayingFromOfflineCache: res.isOfflineCached });
          } else {
            await audioEngine.resume();
          }
        }
      },

      pausePlayback: () => {
        if (get().isPlaying) {
          audioEngine.pause();
          set({ isPlaying: false });
        }
      },

      nextTrack: async () => {
        const state = get();
        const nextIdx = getNextQueueIndex({
          currentIndex: state.currentIndex,
          queueLength: state.queue.length,
          repeat: state.repeat,
          shuffle: state.shuffle,
        });

        if (nextIdx === null) {
          set({ isPlaying: false });
          return;
        }
        const nextItem = state.queue[nextIdx];
        if (!nextItem) return;

        set({
          currentIndex: nextIdx,
          currentTime: 0,
          duration: nextItem.duration || 0,
          playbackError: null,
        });
        const res = await audioEngine.loadAndPlay(nextItem, state.volume);
        set({ isPlayingFromOfflineCache: res.isOfflineCached });
      },

      previousTrack: async () => {
        const state = get();
        if (state.currentTime > 3) {
          audioEngine.seek(0);
          set({ currentTime: 0 });
          return;
        }

        const prevIdx = getPreviousQueueIndex({
          currentIndex: state.currentIndex,
          queueLength: state.queue.length,
          repeat: state.repeat,
        });
        if (prevIdx === null) return;
        const prevItem = state.queue[prevIdx];
        if (!prevItem) return;

        set({
          currentIndex: prevIdx,
          currentTime: 0,
          duration: prevItem.duration || 0,
          playbackError: null,
        });
        const res = await audioEngine.loadAndPlay(prevItem, state.volume);
        set({ isPlayingFromOfflineCache: res.isOfflineCached });
      },

      seek: (time) => {
        audioEngine.seek(time);
        set({ currentTime: time });
      },

      setVolume: (vol) => {
        const clamped = Math.max(0, Math.min(1, vol));
        audioEngine.setVolume(clamped);
        set({ volume: clamped });
      },

      toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),

      cycleRepeat: () =>
        set((s) => ({
          repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off',
        })),

      addToQueue: (track) =>
        set((s) => {
          if (s.queue.some((t) => t.id === track.id)) return s;
          const updated = [...s.queue, track];
          return {
            queue: updated,
            currentIndex: s.currentIndex === -1 ? 0 : s.currentIndex,
          };
        }),

      removeFromQueue: (index) =>
        set((s) => {
          const nextQueue = s.queue.filter((_, idx) => idx !== index);
          let nextIdx = s.currentIndex;
          if (index < s.currentIndex) nextIdx -= 1;
          if (nextIdx >= nextQueue.length) nextIdx = nextQueue.length - 1;
          return { queue: nextQueue, currentIndex: nextIdx };
        }),

      setFullScreen: (open) => set({ isFullScreen: open }),
      setQueueOpen: (open) => set({ isQueueOpen: open }),
      clearError: () => set({ playbackError: null }),
    }),
    {
      name: 'vesper-player-state',
      partialize: (state) => ({
        queue: state.queue.slice(0, 40),
        currentIndex: state.currentIndex,
        volume: state.volume,
        repeat: state.repeat,
        shuffle: state.shuffle,
      }),
    }
  )
);

// Bind singleton audio engine callbacks once
audioEngine.setCallbacks({
  onTimeUpdate: (currentTime, duration) => {
    usePlayerStore.setState({
      currentTime,
      duration: duration > 0 ? duration : usePlayerStore.getState().duration,
    });
  },
  onPlayStateChange: (isPlaying) => {
    usePlayerStore.setState({ isPlaying });
  },
  onEnded: () => {
    void usePlayerStore.getState().nextTrack();
  },
  onError: (message) => {
    usePlayerStore.setState({ playbackError: message, isPlaying: false });
  },
  onNext: () => {
    void usePlayerStore.getState().nextTrack();
  },
  onPrevious: () => {
    void usePlayerStore.getState().previousTrack();
  },
});
