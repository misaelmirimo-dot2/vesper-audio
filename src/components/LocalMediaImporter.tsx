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
        className={`rounded-2xl border border-dashed p-6 transition-colors bg-[#0A0A10] ${
          isDragging
            ? 'border-sky-500 bg-sky-500/10'
            : 'border-[#1C1C2E] hover:border-[#2C2C44]'
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
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
              {isImporting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <FolderUp className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#F8FAFC]">
                Import Audio or Video Files from Device
              </p>
              <p className="mt-1 text-xs text-[#94A3B8]">
                Drag and drop or select MP3, M4A, WAV, FLAC, OGG, MP4, WebM, or
                MOV files. Saved privately in your browser for offline playback.
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-3.5 text-[11px] text-[#94A3B8]">
                <span className="inline-flex items-center gap-1.5">
                  <FileAudio className="w-3.5 h-3.5 text-sky-400" />
                  Audio plays in Global Player & playlists
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <FileVideo className="w-3.5 h-3.5 text-sky-400" />
                  Video plays in the Offline Video Stage
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isImporting}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-xs font-medium text-white hover:bg-sky-400 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 min-h-[44px] shadow-md shadow-sky-500/25"
          >
            <FolderUp className="w-4 h-4" />
            <span>{isImporting ? 'Importing...' : 'Choose Files'}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessages.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300 space-y-1.5"
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
