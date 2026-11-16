import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeLicenseCode,
  validateTrackLicense,
} from './licenseValidator.ts';

test('normalizes Creative Commons license URLs accurately', () => {
  assert.equal(
    normalizeLicenseCode('http://creativecommons.org/licenses/by-nc-sa/3.0/').code,
    'CC BY-NC-SA'
  );
  assert.equal(
    normalizeLicenseCode('https://creativecommons.org/licenses/by-nd/3.0/').code,
    'CC BY-ND'
  );
  assert.equal(
    normalizeLicenseCode('https://creativecommons.org/licenses/by/4.0/').code,
    'CC BY'
  );
});

test('blocks download when audiodownload_allowed is false', () => {
  const result = validateTrackLicense({
    audiodownloadAllowed: false,
    downloadUrl: 'https://example.com/audio.mp3',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
    globalDownloadsEnabled: true,
    commercialModeRequested: false,
  });

  assert.equal(result.offlineDownloadPermitted, false);
  assert.match(result.blockedReason ?? '', /audiodownload_allowed = false/);
});

test('blocks download when global downloads are disabled by admin', () => {
  const result = validateTrackLicense({
    audiodownloadAllowed: true,
    downloadUrl: 'https://example.com/audio.mp3',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
    globalDownloadsEnabled: false,
    commercialModeRequested: false,
  });

  assert.equal(result.offlineDownloadPermitted, false);
  assert.match(result.blockedReason ?? '', /disabled globally/);
});

test('allows CC BY-NC for personal offline listening but blocks in commercial mode', () => {
  const personal = validateTrackLicense({
    audiodownloadAllowed: true,
    downloadUrl: 'https://example.com/audio.mp3',
    licenseUrl: 'https://creativecommons.org/licenses/by-nc/3.0/',
    globalDownloadsEnabled: true,
    commercialModeRequested: false,
  });
  assert.equal(personal.offlineDownloadPermitted, true);
  assert.equal(personal.commercialUsePermitted, false);

  const commercial = validateTrackLicense({
    audiodownloadAllowed: true,
    downloadUrl: 'https://example.com/audio.mp3',
    licenseUrl: 'https://creativecommons.org/licenses/by-nc/3.0/',
    globalDownloadsEnabled: true,
    commercialModeRequested: true,
  });
  assert.equal(commercial.offlineDownloadPermitted, false);
  assert.match(commercial.blockedReason ?? '', /Commercial Use mode/);
});

test('marks CC BY-ND as no-derivatives', () => {
  const result = validateTrackLicense({
    audiodownloadAllowed: true,
    downloadUrl: 'https://example.com/audio.mp3',
    licenseUrl: 'https://creativecommons.org/licenses/by-nd/3.0/',
    globalDownloadsEnabled: true,
    commercialModeRequested: true,
  });

  assert.equal(result.offlineDownloadPermitted, true);
  assert.equal(result.commercialUsePermitted, true);
  assert.equal(result.derivativesPermitted, false);
  assert.match(result.summary, /No derivatives/);
});
