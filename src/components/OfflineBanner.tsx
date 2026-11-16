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
      className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/25 bg-[#1B1712] px-4 py-2 text-xs text-amber-200"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>
          Offline Mode active — browsing cached library, saved playlists, and
          authorized downloaded tracks. Online Jamendo searches require a
          connection.
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Link
          to="/downloads"
          className="font-medium text-amber-300 underline underline-offset-4 hover:text-amber-100"
        >
          Open Downloads
        </Link>
        {simulatedOffline && onExitSimulated && (
          <button
            type="button"
            onClick={onExitSimulated}
            className="rounded-md border border-amber-400/30 px-2.5 py-1 text-xs font-medium text-amber-100 hover:bg-amber-400/10"
          >
            Reconnect
          </button>
        )}
      </div>
    </div>
  );
};
