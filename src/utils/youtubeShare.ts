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

/**
 * Synchronously copies text to the clipboard during a user gesture (click)
 * before navigation or tab-focus changes can invalidate async clipboard APIs.
 */
export function copyTextSynchronously(text: string): boolean {
  if (!text || typeof document === 'undefined') return false;

  try {
    const activeElement = document.activeElement as HTMLElement | null;
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    textarea.style.fontSize = '16px';
    document.body.appendChild(textarea);

    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, text.length);

    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(textarea);
      selection.removeAllRanges();
      selection.addRange(range);
      textarea.setSelectionRange(0, text.length);
    }

    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (activeElement && typeof activeElement.focus === 'function') {
      activeElement.focus({ preventScroll: true });
    }
    return copied;
  } catch {
    return false;
  }
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // Run synchronous copy first inside the active user gesture before any tab switch
  const syncCopied = copyTextSynchronously(text);
  if (syncCopied) {
    return true;
  }

  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}
