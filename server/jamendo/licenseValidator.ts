import type { LicenseCode, LicenseEvaluation } from '../../src/types/music.ts';

export interface LicenseCheckInput {
  audiodownloadAllowed: boolean;
  downloadUrl: string | null | undefined;
  licenseUrl?: string | null;
  licenseName?: string | null;
  globalDownloadsEnabled: boolean;
  commercialModeRequested: boolean;
  checkedAt?: string;
}

export function normalizeLicenseCode(rawUrlOrName?: string | null): {
  code: LicenseCode;
  canonicalUrl: string;
} {
  const raw = (rawUrlOrName ?? '').toLowerCase();

  if (raw.includes('by-nc-nd') || raw.includes('by_nc_nd')) {
    return {
      code: 'CC BY-NC-ND',
      canonicalUrl: 'https://creativecommons.org/licenses/by-nc-nd/3.0/',
    };
  }
  if (raw.includes('by-nc-sa') || raw.includes('by_nc_sa')) {
    return {
      code: 'CC BY-NC-SA',
      canonicalUrl: 'https://creativecommons.org/licenses/by-nc-sa/3.0/',
    };
  }
  if (raw.includes('by-nc') || raw.includes('by_nc')) {
    return {
      code: 'CC BY-NC',
      canonicalUrl: 'https://creativecommons.org/licenses/by-nc/3.0/',
    };
  }
  if (raw.includes('by-nd') || raw.includes('by_nd')) {
    return {
      code: 'CC BY-ND',
      canonicalUrl: 'https://creativecommons.org/licenses/by-nd/3.0/',
    };
  }
  if (raw.includes('by-sa') || raw.includes('by_sa')) {
    return {
      code: 'CC BY-SA',
      canonicalUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    };
  }
  if (raw.includes('/by/') || raw === 'cc by' || raw.includes('cc-by')) {
    return {
      code: 'CC BY',
      canonicalUrl: 'https://creativecommons.org/licenses/by/3.0/',
    };
  }
  if (raw.includes('jamendo') || raw.includes('pro')) {
    return {
      code: 'JAMENDO_PRO',
      canonicalUrl: 'https://licensing.jamendo.com/',
    };
  }

  return {
    code: 'UNKNOWN',
    canonicalUrl: rawUrlOrName || 'https://developer.jamendo.com/v3.0/docs',
  };
}

export function validateTrackLicense(input: LicenseCheckInput): LicenseEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const { code, canonicalUrl } = normalizeLicenseCode(
    input.licenseUrl || input.licenseName
  );
  const licenseUrl = input.licenseUrl || canonicalUrl;

  const isNonCommercial =
    code === 'CC BY-NC' ||
    code === 'CC BY-NC-SA' ||
    code === 'CC BY-NC-ND' ||
    code === 'UNKNOWN' ||
    code === 'JAMENDO_PRO';

  const isNoDerivatives =
    code === 'CC BY-ND' ||
    code === 'CC BY-NC-ND' ||
    code === 'UNKNOWN' ||
    code === 'JAMENDO_PRO';

  const commercialUsePermitted = !isNonCommercial;
  const derivativesPermitted = !isNoDerivatives;
  const redistributionPermitted = code !== 'UNKNOWN' && code !== 'JAMENDO_PRO';

  let blockedReason: string | null = null;
  let offlineDownloadPermitted = true;

  if (!input.globalDownloadsEnabled) {
    offlineDownloadPermitted = false;
    blockedReason =
      'Offline downloads are currently disabled globally by the administrator.';
  } else if (!input.audiodownloadAllowed) {
    offlineDownloadPermitted = false;
    blockedReason =
      'Rights holder has disabled audio downloads (audiodownload_allowed = false) for this track on Jamendo. Streaming only.';
  } else if (!input.downloadUrl) {
    offlineDownloadPermitted = false;
    blockedReason = 'No authorized download URL was provided by Jamendo.';
  } else if (code === 'UNKNOWN' || code === 'JAMENDO_PRO') {
    offlineDownloadPermitted = false;
    blockedReason =
      'Track licence could not be verified as permitting free offline caching.';
  } else if (input.commercialModeRequested && !commercialUsePermitted) {
    offlineDownloadPermitted = false;
    blockedReason = `Blocked in Commercial Use mode: ${code} prohibits commercial use unless a separate Jamendo commercial licence is obtained.`;
  }

  const summaryParts: string[] = [
    `Licence: ${code}`,
    commercialUsePermitted ? 'Commercial use allowed' : 'Non-commercial only',
    derivativesPermitted
      ? 'Derivatives permitted'
      : 'No derivatives (do not modify or transcode)',
    'Artist & Jamendo attribution required',
  ];

  return {
    licenseType: code,
    licenseUrl,
    audiodownloadAllowed: input.audiodownloadAllowed,
    globalDownloadsEnabled: input.globalDownloadsEnabled,
    commercialModeRequested: input.commercialModeRequested,
    offlineDownloadPermitted,
    commercialUsePermitted,
    derivativesPermitted,
    redistributionPermitted,
    attributionRequired: true,
    blockedReason,
    summary: summaryParts.join(' · '),
    checkedAt,
  };
}
