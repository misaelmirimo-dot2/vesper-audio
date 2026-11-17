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
        className={`rounded-2xl border border-dashed p-5 sm:p-6 transition-colors bg-[#181818] ${
          isDragging
            ? 'border-[#1ED760] bg-[#1ED760]/10'
            : 'border-white/15 hover:border-white/30'
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
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1ED760]/15 text-[#1ED760]">
              {isImporting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <FolderUp className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">
                Import Audio or Video Files from Device
              </p>
              <p className="mt-1 text-xs text-[#B3B3B3]">
                Select MP3, M4A, WAV, FLAC, OGG, MP4, WebM, or MOV files. Saved
                privately on this device for offline playback.
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-3.5 text-[11px] text-[#B3B3B3]">
                <span className="inline-flex items-center gap-1.5">
                  <FileAudio className="w-3.5 h-3.5 text-[#1ED760]" />
                  Audio plays in Global Player
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <FileVideo className="w-3.5 h-3.5 text-[#1ED760]" />
                  Video plays in Offline Stage
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isImporting}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1ED760] px-6 py-3 text-xs font-bold text-black hover:bg-[#1FDF64] active:scale-[0.97] disabled:opacity-60 transition-all whitespace-nowrap shrink-0 min-h-[44px]"
          >
            <FolderUp className="w-4 h-4" />
            <span>{isImporting ? 'Importing...' : 'Choose Files'}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-xl bg-[#1ED760]/15 border border-[#1ED760]/30 px-4 py-3 text-xs text-[#1ED760] font-medium"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
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
