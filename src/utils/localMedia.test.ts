import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLocalMediaDedupeKey,
  detectLocalMediaType,
  inferMimeType,
  isIncompleteBrowserDownload,
  localMediaToNormalizedTrack,
  normalizeDownloadContentType,
  parseMediaMetadataFromFilename,
} from './localMedia.ts';

test('detectLocalMediaType classifies audio and video files by mime and extension', () => {
  assert.equal(detectLocalMediaType('rumba.mp3', 'audio/mpeg'), 'audio');
  assert.equal(detectLocalMediaType('live-set.MP4', ''), 'video');
  assert.equal(detectLocalMediaType('voice-note.m4a', ''), 'audio');
  assert.equal(detectLocalMediaType('clip.webm', 'video/webm'), 'video');
  assert.equal(detectLocalMediaType('document.pdf', 'application/pdf'), null);
  assert.equal(detectLocalMediaType('song.mp3.crdownload', ''), null);
  assert.equal(detectLocalMediaType('video.mp4.part', ''), null);
});

test('isIncompleteBrowserDownload detects temporary browser download extensions', () => {
  assert.equal(isIncompleteBrowserDownload('track.mp3.crdownload'), true);
  assert.equal(isIncompleteBrowserDownload('clip.mp4.PART'), true);
  assert.equal(isIncompleteBrowserDownload('unfinished.download'), true);
  assert.equal(isIncompleteBrowserDownload('finished.mp3'), false);
});

test('buildLocalMediaDedupeKey normalizes filename case and file size', () => {
  assert.equal(
    buildLocalMediaDedupeKey('  Song Title.MP3 ', 4096),
    buildLocalMediaDedupeKey('song title.mp3', 4096)
  );
  assert.notEqual(
    buildLocalMediaDedupeKey('song.mp3', 4096),
    buildLocalMediaDedupeKey('song.mp3', 4097)
  );
});

test('inferMimeType fills missing browser mime types from extensions', () => {
  assert.equal(inferMimeType('track.mp3', '', 'audio'), 'audio/mpeg');
  assert.equal(inferMimeType('video.mov', '', 'video'), 'video/quicktime');
  assert.equal(inferMimeType('song.flac', 'audio/flac', 'audio'), 'audio/flac');
});

test('parseMediaMetadataFromFilename extracts artist and title when hyphenated', () => {
  assert.deepEqual(
    parseMediaMetadataFromFilename('Fally Ipupa - Eloko_Oyo.mp3'),
    { artist: 'Fally Ipupa', title: 'Eloko Oyo' }
  );
  assert.deepEqual(
    parseMediaMetadataFromFilename('Kinshasa_Live_2025.mp4'),
    { artist: 'Local Device File', title: 'Kinshasa Live 2025' }
  );
});

test('localMediaToNormalizedTrack produces a playable local NormalizedTrack', () => {
  const track = localMediaToNormalizedTrack({
    id: 'local-123',
    title: 'Acoustic Cut',
    artist: 'Studio',
    mediaType: 'audio',
    mimeType: 'audio/wav',
    fileName: 'Studio - Acoustic Cut.wav',
    fileSizeBytes: 2048,
    duration: 42,
    addedAt: '2026-11-16T00:00:00.000Z',
  });
  assert.equal(track.provider, 'local');
  assert.equal(track.sourceMode, 'local-device');
  assert.equal(track.licenseType, 'LOCAL_FILE');
  assert.equal(track.duration, 42);
});

test('normalizeDownloadContentType replaces text/html with audio/mpeg', () => {
  assert.equal(
    normalizeDownloadContentType('text/html; charset=UTF-8', 'mp32'),
    'audio/mpeg'
  );
  assert.equal(normalizeDownloadContentType('audio/wav'), 'audio/wav');
});
