import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Y2MATE_TARGET_URL,
  getCanonicalYouTubeUrl,
} from './youtubeShare';

test('Y2MATE_TARGET_URL matches the requested y2mate site', () => {
  assert.equal(Y2MATE_TARGET_URL, 'https://v42.www-y2mate.com/');
});

test('getCanonicalYouTubeUrl prefers trimmed watchUrl when present', () => {
  assert.equal(
    getCanonicalYouTubeUrl({
      videoId: 'abc123',
      watchUrl: ' https://www.youtube.com/watch?v=abc123 ',
    }),
    'https://www.youtube.com/watch?v=abc123'
  );
});

test('getCanonicalYouTubeUrl falls back to building watch URL from videoId', () => {
  assert.equal(
    getCanonicalYouTubeUrl({ videoId: 'dQw4w9WgXcQ' }),
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  );
});

test('getCanonicalYouTubeUrl returns empty string when neither watchUrl nor videoId exists', () => {
  assert.equal(getCanonicalYouTubeUrl({}), '');
});
