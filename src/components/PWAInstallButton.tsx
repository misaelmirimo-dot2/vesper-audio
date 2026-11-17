import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({
  compact = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="flex items-center justify-center gap-2 rounded-full bg-[#1ED760] px-4 py-2 text-xs font-bold text-black hover:bg-[#1FDF64] active:scale-[0.97] transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white min-h-[36px]"
      >
        <Download className="w-3.5 h-3.5" />
        <span>{compact ? 'Install' : 'Install App'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center justify-center gap-1.5 rounded-full bg-[#242424] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#2E2E2E] active:scale-[0.97] transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1ED760] min-h-[36px]"
        >
          <Share className="w-3.5 h-3.5 text-[#1ED760]" />
          <span>{compact ? 'Get App' : 'Install on iOS'}</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
          >
            <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl bg-[#242424] p-6 shadow-2xl pb-safe">
              <div className="w-10 h-1 bg-white/25 rounded-full mx-auto mb-4 sm:hidden" />
              <div className="flex items-center justify-between">
                <h3
                  id="ios-install-title"
                  className="text-base font-bold text-white"
                >
                  Install Vesper on iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close iOS install instructions"
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#B3B3B3] hover:text-white rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="mt-4 space-y-2.5 text-sm text-[#B3B3B3]">
                <li>1. Tap the Share button in the Safari toolbar.</li>
                <li>2. Scroll down and select Add to Home Screen.</li>
                <li>3. Launch Vesper directly from your Home Screen.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-full bg-[#1ED760] py-3 text-sm font-bold text-black hover:bg-[#1FDF64] active:scale-[0.98] transition-all"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
