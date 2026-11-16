import type { NormalizedTrack } from '../types/music.ts';
import { resolvePlayableAudioUrl } from './offlineStorage.ts';

export interface AudioEngineCallbacks {
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onEnded: () => void;
  onPlayStateChange: (isPlaying: boolean) => void;
  onError: (message: string) => void;
  onNext: () => void;
  onPrevious: () => void;
}

class SingletonAudioEngine {
  private audio: HTMLAudioElement | null = null;
  private currentObjectUrl: string | null = null;
  private currentTrackId: string | null = null;
  private callbacks: AudioEngineCallbacks | null = null;

  private ensureAudio(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = 'metadata';

      this.audio.addEventListener('timeupdate', () => {
        if (!this.audio) return;
        this.callbacks?.onTimeUpdate(
          this.audio.currentTime || 0,
          Number.isFinite(this.audio.duration) ? this.audio.duration : 0
        );
      });

      this.audio.addEventListener('loadedmetadata', () => {
        if (!this.audio) return;
        this.callbacks?.onTimeUpdate(
          this.audio.currentTime || 0,
          Number.isFinite(this.audio.duration) ? this.audio.duration : 0
        );
      });

      this.audio.addEventListener('play', () => {
        this.callbacks?.onPlayStateChange(true);
      });

      this.audio.addEventListener('pause', () => {
        this.callbacks?.onPlayStateChange(false);
      });

      this.audio.addEventListener('ended', () => {
        this.callbacks?.onPlayStateChange(false);
        this.callbacks?.onEnded();
      });

      this.audio.addEventListener('error', () => {
        this.callbacks?.onPlayStateChange(false);
        this.callbacks?.onError(
          'Unable to play audio stream. Check connection or try an offline downloaded track.'
        );
      });
    }
    return this.audio;
  }

  setCallbacks(callbacks: AudioEngineCallbacks) {
    this.callbacks = callbacks;
  }

  private updateMediaSession(track: NormalizedTrack) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artistName,
        album: track.albumName || 'Independent Release',
        artwork: track.artworkUrl
          ? [
              {
                src: track.artworkUrl,
                sizes: '512x512',
                type: 'image/jpeg',
              },
            ]
          : [],
      });

      navigator.mediaSession.setActionHandler('play', () => {
        this.resume();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        this.pause();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        this.callbacks?.onPrevious();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        this.callbacks?.onNext();
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (typeof details.seekTime === 'number') {
          this.seek(details.seekTime);
        }
      });
    } catch {
      // MediaSession unsupported on some browsers
    }
  }

  async loadAndPlay(track: NormalizedTrack, volume: number): Promise<{ isOfflineCached: boolean }> {
    const audio = this.ensureAudio();
    audio.pause();

    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }

    const resolved = await resolvePlayableAudioUrl(track);
    if (resolved.revokeAfterUse) {
      this.currentObjectUrl = resolved.url;
    }

    this.currentTrackId = track.id;
    audio.src = resolved.url;
    audio.volume = Math.max(0, Math.min(1, volume));
    this.updateMediaSession(track);

    try {
      await audio.play();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        this.callbacks?.onPlayStateChange(false);
      } else {
        this.callbacks?.onError(
          'Playback blocked or stream unavailable. Tap play to retry.'
        );
      }
    }

    return { isOfflineCached: resolved.isOfflineCached };
  }

  async resume() {
    const audio = this.ensureAudio();
    if (!audio.src) return;
    try {
      await audio.play();
    } catch {
      this.callbacks?.onError('Unable to resume playback.');
    }
  }

  pause() {
    this.audio?.pause();
  }

  seek(timeSeconds: number) {
    if (!this.audio) return;
    if (Number.isFinite(timeSeconds)) {
      this.audio.currentTime = Math.max(0, timeSeconds);
    }
  }

  setVolume(volume: number) {
    if (!this.audio) return;
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  getCurrentTrackId() {
    return this.currentTrackId;
  }
}

export const audioEngine = new SingletonAudioEngine();
