import React from 'react';
import { WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';

interface OfflineBannerProps {
  isOnline: boolean;
  simulatedOffline: boolean;
  onExitSimulated?: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOnline,
  simulatedOffline,
  onExitSimulated,
}) => {
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#242424] px-4 py-2 text-xs text-white"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="w-3.5 h-3.5 text-[#1ED760] shrink-0" />
        <span className="text-[#E5E5E5]">
          Offline Mode — playing cached library, saved playlists, and local files.
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Link
          to="/downloads"
          className="font-semibold text-[#1ED760] hover:underline underline-offset-4"
        >
          Open Offline
        </Link>
        {simulatedOffline && onExitSimulated && (
          <button
            type="button"
            onClick={onExitSimulated}
            className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white hover:bg-white/25 transition-colors"
          >
            Go Online
          </button>
        )}
      </div>
    </div>
  );
};
