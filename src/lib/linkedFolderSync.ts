import { offlineDb, type LinkedFolderRecord } from './offlineDb.ts';
import { saveLocalMediaFile } from './offlineStorage.ts';
import {
  buildLocalMediaDedupeKey,
  detectLocalMediaType,
  type LocalMediaRecord,
} from '../utils/localMedia.ts';

export const LINKED_DOWNLOADS_FOLDER_ID = 'downloads-folder';

export type DirectoryPermissionState = 'granted' | 'prompt' | 'denied' | 'unsupported';

interface BrowserFileHandleLike {
  kind: 'file';
  name: string;
  getFile: () => Promise<File>;
}

interface BrowserDirectoryHandleLike {
  kind: 'directory';
  name: string;
  values: () => AsyncIterable<
    BrowserFileHandleLike | { kind: string; name: string }
  >;
  queryPermission?: (opts?: { mode?: 'read' | 'readwrite' }) => Promise<string>;
  requestPermission?: (opts?: { mode?: 'read' | 'readwrite' }) => Promise<string>;
}

export interface LinkedFolderStatus {
  supported: boolean;
  linked: boolean;
  folderName: string | null;
  permissionState: DirectoryPermissionState;
  lastSyncedAt: string | null;
  lastImportedCount: number;
}

export interface FolderSyncResult {
  imported: LocalMediaRecord[];
  skippedPartial: number;
  permissionState: DirectoryPermissionState;
  folderName: string | null;
}

export function isDirectoryPickerSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as unknown as { showDirectoryPicker?: unknown })
      .showDirectoryPicker === 'function'
  );
}

export async function getLinkedFolderRecord(): Promise<LinkedFolderRecord | null> {
  try {
    const rec = await offlineDb.linkedFolders.get(LINKED_DOWNLOADS_FOLDER_ID);
    return rec ?? null;
  } catch {
    return null;
  }
}

async function resolvePermissionState(
  handle: BrowserDirectoryHandleLike,
  requestIfPrompt: boolean
): Promise<DirectoryPermissionState> {
  try {
    if (typeof handle.queryPermission === 'function') {
      const current = await handle.queryPermission({ mode: 'read' });
      if (current === 'granted') return 'granted';
      if (current === 'prompt' && requestIfPrompt && typeof handle.requestPermission === 'function') {
        const requested = await handle.requestPermission({ mode: 'read' });
        if (requested === 'granted') return 'granted';
        if (requested === 'denied') return 'denied';
        return 'prompt';
      }
      if (current === 'denied') return 'denied';
      if (current === 'prompt') return 'prompt';
    }
    return 'granted';
  } catch {
    return 'denied';
  }
}

export async function getLinkedFolderStatus(): Promise<LinkedFolderStatus> {
  const supported = isDirectoryPickerSupported();
  const rec = await getLinkedFolderRecord();
  if (!rec || !rec.handle) {
    return {
      supported,
      linked: false,
      folderName: null,
      permissionState: supported ? 'prompt' : 'unsupported',
      lastSyncedAt: null,
      lastImportedCount: 0,
    };
  }

  const handle = rec.handle as BrowserDirectoryHandleLike;
  const permissionState = await resolvePermissionState(handle, false);

  return {
    supported,
    linked: true,
    folderName: rec.name,
    permissionState,
    lastSyncedAt: rec.lastSyncedAt,
    lastImportedCount: rec.lastImportedCount,
  };
}

export async function linkDownloadsDirectory(): Promise<LinkedFolderRecord | null> {
  if (!isDirectoryPickerSupported()) {
    throw new Error(
      'Automatic folder linking is not supported in this browser. Use Choose Files below to import downloaded audio or video.'
    );
  }

  const picker = (
    window as unknown as {
      showDirectoryPicker: (options?: {
        id?: string;
        mode?: 'read' | 'readwrite';
        startIn?: string;
      }) => Promise<BrowserDirectoryHandleLike>;
    }
  ).showDirectoryPicker;

  let handle: BrowserDirectoryHandleLike;
  try {
    handle = await picker({
      id: 'vesper-downloads',
      mode: 'read',
      startIn: 'downloads',
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return null;
    }
    throw err;
  }

  const now = new Date().toISOString();
  const record: LinkedFolderRecord = {
    id: LINKED_DOWNLOADS_FOLDER_ID,
    name: handle.name || 'Downloads',
    handle,
    linkedAt: now,
    lastSyncedAt: now,
    lastImportedCount: 0,
  };
  await offlineDb.linkedFolders.put(record);
  return record;
}

export async function unlinkDownloadsDirectory(): Promise<void> {
  await offlineDb.linkedFolders.delete(LINKED_DOWNLOADS_FOLDER_ID);
}

export async function syncLinkedDownloadsDirectory(
  existingMedia: LocalMediaRecord[],
  requestPermissionIfNeeded = false
): Promise<FolderSyncResult> {
  const rec = await getLinkedFolderRecord();
  if (!rec || !rec.handle) {
    return {
      imported: [],
      skippedPartial: 0,
      permissionState: isDirectoryPickerSupported() ? 'prompt' : 'unsupported',
      folderName: null,
    };
  }

  const handle = rec.handle as BrowserDirectoryHandleLike;
  const permissionState = await resolvePermissionState(
    handle,
    requestPermissionIfNeeded
  );

  if (permissionState !== 'granted') {
    return {
      imported: [],
      skippedPartial: 0,
      permissionState,
      folderName: rec.name,
    };
  }

  const existingKeys = new Set(
    existingMedia.map((m) =>
      buildLocalMediaDedupeKey(m.fileName, m.fileSizeBytes)
    )
  );

  const imported: LocalMediaRecord[] = [];
  let skippedPartial = 0;

  for await (const entry of handle.values()) {
    if (entry.kind !== 'file') continue;
    const fileHandle = entry as BrowserFileHandleLike;
    try {
      const file = await fileHandle.getFile();
      if (!file || file.size === 0) {
        skippedPartial += 1;
        continue;
      }
      const mediaType = detectLocalMediaType(file.name, file.type);
      if (!mediaType) continue;

      const key = buildLocalMediaDedupeKey(file.name, file.size);
      if (existingKeys.has(key)) continue;

      const saved = await saveLocalMediaFile(file);
      existingKeys.add(key);
      imported.push(saved);
    } catch {
      // File may currently be locked while downloading; skip cleanly
      skippedPartial += 1;
    }
  }

  const now = new Date().toISOString();
  await offlineDb.linkedFolders.put({
    ...rec,
    lastSyncedAt: now,
    lastImportedCount: imported.length,
  });

  return {
    imported,
    skippedPartial,
    permissionState,
    folderName: rec.name,
  };
}
