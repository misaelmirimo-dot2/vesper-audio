import type { DownloadEntry, LicenseEvaluation, NormalizedTrack } from '../types/music.ts';
import { offlineDb } from './offlineDb.ts';
import {
  detectLocalMediaType,
  inferMimeType,
  normalizeDownloadContentType,
  parseMediaMetadataFromFilename,
  probeMediaDuration,
  type LocalMediaRecord,
} from '../utils/localMedia.ts';

export const AUDIO_CACHE_NAME = 'vesper-audio-cache-v1';

const activeControllers = new Map<string, AbortController>();

export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return false;
  }
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function getStorageEstimate(): Promise<{
  usageBytes: number;
  quotaBytes: number;
  persisted: boolean;
}> {
  let usageBytes = 0;
  let quotaBytes = 0;
  let persisted = false;

  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      usageBytes = est.usage ?? 0;
      quotaBytes = est.quota ?? 0;
    }
    if (navigator.storage?.persisted) {
      persisted = await navigator.storage.persisted();
    }
  } catch {
    // Ignore storage API error
  }

  return { usageBytes, quotaBytes, persisted };
}

export function getCacheKeyForTrack(trackId: string): string {
  return `/offline-audio/${encodeURIComponent(trackId)}`;
}

export async function isTrackCachedOffline(trackId: string): Promise<boolean> {
  if (typeof caches === 'undefined') return false;
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const match = await cache.match(getCacheKeyForTrack(trackId));
    return Boolean(match);
  } catch {
    return false;
  }
}

export async function resolvePlayableAudioUrl(track: NormalizedTrack): Promise<{
  url: string;
  isOfflineCached: boolean;
  revokeAfterUse: boolean;
}> {
  if (track.provider === 'local' || track.id.startsWith('local-media-')) {
    try {
      const blobRecord = await offlineDb.localMediaBlobs.get(track.id);
      if (blobRecord?.blob) {
        const objectUrl = URL.createObjectURL(blobRecord.blob);
        return { url: objectUrl, isOfflineCached: true, revokeAfterUse: true };
      }
    } catch {
      // Fall through
    }
  }

  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(AUDIO_CACHE_NAME);
      const cached = await cache.match(getCacheKeyForTrack(track.id));
      if (cached) {
        const blob = await cached.blob();
        const objectUrl = URL.createObjectURL(blob);
        return { url: objectUrl, isOfflineCached: true, revokeAfterUse: true };
      }
    } catch {
      // Fall back to streaming URL
    }
  }
  return {
    url: track.streamingUrl,
    isOfflineCached: false,
    revokeAfterUse: false,
  };
}

export async function saveLocalMediaFile(file: File): Promise<LocalMediaRecord> {
  const mediaType = detectLocalMediaType(file.name, file.type);
  if (!mediaType) {
    throw new Error(
      `Unsupported file format (${file.name}). Import MP3, M4A, WAV, FLAC, OGG, MP4, WebM, or MOV files.`
    );
  }

  const mimeType = inferMimeType(file.name, file.type, mediaType);
  const { title, artist } = parseMediaMetadataFromFilename(file.name);
  const duration = await probeMediaDuration(file, mediaType);
  const uniqueSuffix =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const record: LocalMediaRecord = {
    id: `local-media-${uniqueSuffix}`,
    title,
    artist,
    mediaType,
    mimeType,
    fileName: file.name,
    fileSizeBytes: file.size,
    duration,
    addedAt: new Date().toISOString(),
  };

  await requestPersistentStorage();
  await offlineDb.localMediaBlobs.put({
    id: record.id,
    blob: file.slice(0, file.size, mimeType),
  });
  await offlineDb.localMedia.put(record);
  return record;
}

export async function getLocalMediaObjectUrl(id: string): Promise<string | null> {
  const record = await offlineDb.localMediaBlobs.get(id);
  if (!record?.blob) return null;
  return URL.createObjectURL(record.blob);
}

export async function deleteLocalMediaFile(id: string): Promise<void> {
  await offlineDb.localMedia.delete(id);
  await offlineDb.localMediaBlobs.delete(id);
}

export function cancelTrackDownload(trackId: string): void {
  const controller = activeControllers.get(trackId);
  if (controller) {
    controller.abort();
    activeControllers.delete(trackId);
  }
}

export async function removeDownloadedAudio(trackId: string): Promise<void> {
  cancelTrackDownload(trackId);
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(AUDIO_CACHE_NAME);
      await cache.delete(getCacheKeyForTrack(trackId));
    } catch {
      // Ignore cache delete failure
    }
  }
  await offlineDb.downloads.delete(trackId);
}

export async function downloadAuthorizedTrack(params: {
  track: NormalizedTrack;
  commercialMode: boolean;
  authToken: string | null;
  onProgress: (entry: DownloadEntry) => void;
}): Promise<DownloadEntry> {
  const { track, commercialMode, authToken, onProgress } = params;

  // Step 1: Mandatory backend authorization check (never trust client-side flags)
  const authRes = await fetch('/api/downloads/authorize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({ trackId: track.id, commercialMode }),
  });

  const authJson = (await authRes.json()) as {
    authorized?: boolean;
    reason?: string;
    downloadUrl?: string;
    licenseEvaluation?: LicenseEvaluation;
  };

  if (!authRes.ok || !authJson.authorized || !authJson.downloadUrl) {
    throw new Error(
      authJson.reason || 'Track is not authorized for offline downloading.'
    );
  }

  const controller = new AbortController();
  activeControllers.set(track.id, controller);

  const initialEntry: DownloadEntry = {
    trackId: track.id,
    track,
    status: 'downloading',
    progress: 5,
    fileSizeBytes: 0,
    licenseType:
      authJson.licenseEvaluation?.licenseType ?? track.licenseType,
    licenseVerifiedAt:
      authJson.licenseEvaluation?.checkedAt ?? new Date().toISOString(),
    downloadedAt: new Date().toISOString(),
  };

  await offlineDb.downloads.put(initialEntry);
  onProgress(initialEntry);

  try {
    await requestPersistentStorage();

    const isCrossOrigin =
      /^https?:\/\//i.test(authJson.downloadUrl) &&
      typeof window !== 'undefined' &&
      !authJson.downloadUrl.startsWith(window.location.origin);

    const fetchTarget = isCrossOrigin
      ? `/api/downloads/stream/${encodeURIComponent(track.id)}?commercialMode=${commercialMode}`
      : authJson.downloadUrl;

    const response = await fetch(fetchTarget, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        response.status === 404 || response.status === 410
          ? 'Source download URL expired or unavailable.'
          : `Download failed with HTTP ${response.status}`
      );
    }

    const totalLengthHeader = response.headers.get('content-length');
    const expectedTotal = totalLengthHeader ? Number(totalLengthHeader) : 0;
    const contentType = normalizeDownloadContentType(
      response.headers.get('content-type'),
      track.audioFormat
    );

    let finalBlob: Blob;
    if (response.body) {
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.byteLength;
          const pct =
            expectedTotal > 0
              ? Math.min(95, Math.round((received / expectedTotal) * 100))
              : Math.min(90, Math.round(10 + received / 16000));

          const progressEntry: DownloadEntry = {
            ...initialEntry,
            progress: pct,
            fileSizeBytes: received,
          };
          onProgress(progressEntry);
        }
      }

      const blobParts: BlobPart[] = chunks.map(
        (chunk) => chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as ArrayBuffer
      );
      finalBlob = new Blob(blobParts, { type: contentType });
    } else {
      finalBlob = await response.blob();
    }

    if (typeof caches === 'undefined') {
      throw new Error('Browser Cache Storage API is unavailable in this context.');
    }

    try {
      const cache = await caches.open(AUDIO_CACHE_NAME);
      const cacheResponse = new Response(finalBlob, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(finalBlob.size),
        },
      });
      await cache.put(getCacheKeyForTrack(track.id), cacheResponse);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        throw new Error(
          'Device storage quota exceeded. Remove older downloads to free space.'
        );
      }
      throw err;
    }

    const completedEntry: DownloadEntry = {
      ...initialEntry,
      status: 'completed',
      progress: 100,
      fileSizeBytes: finalBlob.size,
      downloadedAt: new Date().toISOString(),
    };

    await offlineDb.downloads.put(completedEntry);
    onProgress(completedEntry);

    if (authToken) {
      fetch('/api/downloads/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          trackId: track.id,
          status: 'completed',
          fileSizeBytes: finalBlob.size,
        }),
      }).catch(() => {});
    }

    return completedEntry;
  } catch (err) {
    const isCancelled =
      err instanceof DOMException && err.name === 'AbortError';
    const message = isCancelled
      ? 'Download cancelled by user.'
      : err instanceof Error
      ? err.message
      : 'Download interrupted.';

    const failedEntry: DownloadEntry = {
      ...initialEntry,
      status: isCancelled ? 'cancelled' : 'failed',
      progress: 0,
      errorMessage: message,
    };
    await offlineDb.downloads.put(failedEntry);
    onProgress(failedEntry);
    throw new Error(message);
  } finally {
    activeControllers.delete(track.id);
  }
}
