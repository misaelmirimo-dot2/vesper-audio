import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileAudio,
  FileVideo,
  FolderUp,
  Loader2,
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext.tsx';

interface LocalMediaImporterProps {
  onImported?: (count: number) => void;
}

export const LocalMediaImporter: React.FC<LocalMediaImporterProps> = ({
  onImported,
}) => {
  const { importLocalFiles } = useLibrary();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setIsImporting(true);
    setStatusMessage(null);
    setErrorMessages([]);

    try {
      const { imported, errors } = await importLocalFiles(files);
      if (imported.length > 0) {
        setStatusMessage(
          `Added ${imported.length} ${
            imported.length === 1 ? 'file' : 'files'
          } to your offline device locker.`
        );
        onImported?.(imported.length);
      }
      if (errors.length > 0) {
        setErrorMessages(errors);
      }
    } finally {
      setIsImporting(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={`rounded-xl border border-dashed p-5 transition-colors ${
          isDragging
            ? 'border-violet-500 bg-violet-500/10'
            : 'border-[#2E2E3E] bg-[#13131A] hover:border-[#3E3E52]'
        }`}
      >
        <input
          ref={inputRef}
          id="local-media-file-input"
          type="file"
          multiple
          accept="audio/*,video/*,.mp3,.m4a,.wav,.ogg,.oga,.flac,.aac,.opus,.weba,.mp4,.m4v,.webm,.mov,.ogv,.mkv"
          onChange={(e) => void handleFiles(e.target.files)}
          className="sr-only"
          aria-label="Choose audio or video files from your device"
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600/15 border border-violet-500/30 text-violet-300">
              {isImporting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <FolderUp className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#F5F5F7]">
                Import Audio or Video Files from Device
              </p>
              <p className="mt-1 text-xs text-[#9494A3]">
                Drag and drop or select MP3, M4A, WAV, FLAC, OGG, MP4, WebM, or
                MOV files. Saved privately in your browser for offline playback.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[#7E7E90]">
                <span className="inline-flex items-center gap-1">
                  <FileAudio className="w-3.5 h-3.5 text-violet-400" />
                  Audio plays in Global Player & playlists
                </span>
                <span className="inline-flex items-center gap-1">
                  <FileVideo className="w-3.5 h-3.5 text-violet-400" />
                  Video plays in the Offline Video Stage
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isImporting}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
          >
            <FolderUp className="w-4 h-4" />
            <span>{isImporting ? 'Importing...' : 'Choose Files'}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-200"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessages.length > 0 && (
        <div
          role="alert"
          className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200 space-y-1"
        >
          {errorMessages.map((msg, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
