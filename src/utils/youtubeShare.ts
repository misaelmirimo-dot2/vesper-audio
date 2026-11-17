export const Y2MATE_TARGET_URL = 'https://v42.www-y2mate.com/';

export interface YouTubeLinkSource {
  videoId?: string;
  watchUrl?: string;
}

export function getCanonicalYouTubeUrl(video: YouTubeLinkSource): string {
  const trimmedWatchUrl = video.watchUrl?.trim();
  if (trimmedWatchUrl) {
    return trimmedWatchUrl;
  }
  const trimmedId = video.videoId?.trim();
  if (trimmedId) {
    return `https://www.youtube.com/watch?v=${encodeURIComponent(trimmedId)}`;
  }
  return '';
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below if clipboard permission is blocked
    }
  }

  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      return copied;
    } catch {
      return false;
    }
  }

  return false;
}
