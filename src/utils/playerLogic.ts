import type { NormalizedTrack } from '../types/music.ts';

export type RepeatMode = 'off' | 'all' | 'one';

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function computeTotalDuration(tracks: Pick<NormalizedTrack, 'duration'>[]): number {
  return tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
}

export function getNextQueueIndex(params: {
  currentIndex: number;
  queueLength: number;
  repeat: RepeatMode;
  shuffle: boolean;
  randomFn?: () => number;
}): number | null {
  const { currentIndex, queueLength, repeat, shuffle, randomFn = Math.random } = params;
  if (queueLength <= 0) return null;
  if (repeat === 'one') return currentIndex >= 0 ? currentIndex : 0;

  if (shuffle && queueLength > 1) {
    let candidate = Math.floor(randomFn() * queueLength);
    if (candidate === currentIndex) {
      candidate = (currentIndex + 1) % queueLength;
    }
    return candidate;
  }

  const next = currentIndex + 1;
  if (next < queueLength) return next;
  if (repeat === 'all') return 0;
  return null;
}

export function getPreviousQueueIndex(params: {
  currentIndex: number;
  queueLength: number;
  repeat: RepeatMode;
}): number | null {
  const { currentIndex, queueLength, repeat } = params;
  if (queueLength <= 0) return null;
  if (repeat === 'one') return currentIndex >= 0 ? currentIndex : 0;
  const prev = currentIndex - 1;
  if (prev >= 0) return prev;
  if (repeat === 'all') return queueLength - 1;
  return 0;
}

export function reorderList<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= list.length ||
    toIndex >= list.length ||
    fromIndex === toIndex
  ) {
    return list;
  }
  const copy = [...list];
  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, moved);
  return copy;
}
