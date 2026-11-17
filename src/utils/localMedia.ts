import type { NormalizedTrack } from '../types/music.ts';

export interface LocalMediaRecord {
  id: string;
  title: string;
  artist: string;
  mediaType: 'audio' | 'video';
  mimeType: string;
  fileName: string;
  fileSizeBytes: number;
  duration: number;
  addedAt: string;
}

const AUDIO_EXTENSIONS = new Set([
  'mp3',
  'm4a',
  'wav',
  'ogg',
  'oga',
  'flac',
  'aac',
  'opus',
  'weba',
]);

const VIDEO_EXTENSIONS = new Set([
  'mp4',
  'm4v',
  'webm',
  'mov',
  'ogv',
  'mkv',
]);

const INCOMPLETE_DOWNLOAD_EXTENSIONS = new Set([
  'crdownload',
  'part',
  'partial',
  'tmp',
  'download',
]);

export function getFileExtension(fileName: string): string {
  const parts = fileName.trim().toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

export function isIncompleteBrowserDownload(fileName: string): boolean {
  const ext = getFileExtension(fileName);
  return INCOMPLETE_DOWNLOAD_EXTENSIONS.has(ext);
}

export function buildLocalMediaDedupeKey(
  fileName: string,
  fileSizeBytes: number
): string {
  return `${fileName.trim().toLowerCase()}::${fileSizeBytes}`;
}

export function detectLocalMediaType(
  fileName: string,
  mimeType?: string
): 'audio' | 'video' | null {
  if (isIncompleteBrowserDownload(fileName)) return null;
  const mime = (mimeType || '').toLowerCase();
  const ext = getFileExtension(fileName);

  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  if (AUDIO_EXTENSIONS.has(ext)) return 'audio';
  if (VIDEO_EXTENSIONS.has(ext)) return 'video';
  return null;
}

export function inferMimeType(
  fileName: string,
  rawMime: string,
  mediaType: 'audio' | 'video'
): string {
  if (rawMime && (rawMime.startsWith('audio/') || rawMime.startsWith('video/'))) {
    return rawMime;
  }
  const ext = getFileExtension(fileName);
  const map: Record<string, string> = {
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    oga: 'audio/ogg',
    flac: 'audio/flac',
    aac: 'audio/aac',
    opus: 'audio/opus',
    weba: 'audio/webm',
    mp4: 'video/mp4',
    m4v: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    ogv: 'video/ogg',
    mkv: 'video/x-matroska',
  };
  return map[ext] || (mediaType === 'audio' ? 'audio/mpeg' : 'video/mp4');
}

export function parseMediaMetadataFromFilename(fileName: string): {
  title: string;
  artist: string;
} {
  const withoutExt = fileName.replace(/\.[^.]+$/, '').trim();
  const cleaned = withoutExt.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  const sepMatch = /^(.+?)\s+-\s+(.+)$/.exec(cleaned);
  if (sepMatch && sepMatch[1].trim().length > 0 && sepMatch[2].trim().length > 0) {
    return {
      artist: sepMatch[1].trim(),
      title: sepMatch[2].trim(),
    };
  }
  return {
    artist: 'Local Device File',
    title: cleaned || 'Untitled Media',
  };
}

export function localMediaToNormalizedTrack(
  record: LocalMediaRecord
): NormalizedTrack {
  return {
    id: record.id,
    provider: 'local',
    providerTrackId: record.id,
    title: record.title,
    artistName: record.artist,
    artistId: 'local',
    albumName: 'Offline Device Locker',
    albumId: 'local',
    artworkUrl:
      record.mediaType === 'video'
        ? '/covers/cover_nocturne_synth.jpg'
        : '/covers/cover_amber_folk.jpg',
    duration: record.duration || 0,
    genre: record.mediaType === 'video' ? 'Local Video' : 'Local Audio',
    tags: ['local', 'offline', record.mediaType],
    releaseDate: record.addedAt.slice(0, 10),
    isInstrumental: false,
    streamingUrl: '',
    downloadUrl: null,
    originalTrackUrl: '',
    audiodownloadAllowed: false,
    licenseType: 'LOCAL_FILE',
    licenseUrl: '',
    licenseEvaluation: {
      licenseType: 'LOCAL_FILE',
      licenseUrl: '',
      audiodownloadAllowed: false,
      globalDownloadsEnabled: true,
      commercialModeRequested: false,
      offlineDownloadPermitted: false,
      commercialUsePermitted: false,
      derivativesPermitted: true,
      redistributionPermitted: false,
      attributionRequired: false,
      blockedReason: 'Stored locally on your device.',
      summary: 'Imported local file stored in browser IndexedDB for offline playback.',
      checkedAt: record.addedAt,
    },
    sourceMode: 'local-device',
    audioFormat: getFileExtension(record.fileName) || undefined,
  };
}

export function normalizeDownloadContentType(
  rawContentType: string | null | undefined,
  audioFormat?: string
): string {
  const clean = (rawContentType || '').split(';')[0].trim().toLowerCase();
  if (clean.startsWith('audio/')) return clean;
  if (audioFormat === 'ogg') return 'audio/ogg';
  if (audioFormat === 'flac') return 'audio/flac';
  if (audioFormat === 'wav') return 'audio/wav';
  return 'audio/mpeg';
}

export function probeMediaDuration(
  file: Blob,
  mediaType: 'audio' | 'video'
): Promise<number> {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    return Promise.resolve(0);
  }
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const el = document.createElement(mediaType);
    let settled = false;

    const finish = (seconds: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      el.removeAttribute('src');
      el.load();
      URL.revokeObjectURL(objectUrl);
      resolve(Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : 0);
    };

    const timer = setTimeout(() => finish(0), 2500);
    el.preload = 'metadata';
    el.onloadedmetadata = () => finish(el.duration);
    el.onerror = () => finish(0);
    el.src = objectUrl;
  });
}
