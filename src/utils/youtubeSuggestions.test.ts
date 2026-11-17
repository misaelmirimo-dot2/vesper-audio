import test from 'node:test';
import assert from 'node:assert/strict';
import {
  YOUTUBE_BROWSE_CATEGORIES,
  YOUTUBE_SUGGESTED_QUERIES,
  buildYouTubePlayUrl,
} from './youtubeSuggestions.ts';

test('YOUTUBE_SUGGESTED_QUERIES includes music and video suggestions', () => {
  assert.ok(YOUTUBE_SUGGESTED_QUERIES.length >= 6);
  assert.ok(YOUTUBE_SUGGESTED_QUERIES.includes('Afrobeat'));
  assert.ok(YOUTUBE_SUGGESTED_QUERIES.includes('Congolese Rumba'));
});

test('YOUTUBE_BROWSE_CATEGORIES maps every category to a non-empty YouTube query', () => {
  assert.ok(YOUTUBE_BROWSE_CATEGORIES.length >= 6);
  for (const cat of YOUTUBE_BROWSE_CATEGORIES) {
    assert.ok(cat.label.trim().length > 0);
    assert.ok(cat.query.trim().length > 0);
  }
});

test('buildYouTubePlayUrl builds clean /youtube route params', () => {
  assert.equal(
    buildYouTubePlayUrl({ videoId: 'jfKfPfyJRdk' }),
    '/youtube?play=jfKfPfyJRdk'
  );
  assert.equal(
    buildYouTubePlayUrl({ videoId: 'jfKfPfyJRdk', mode: 'music', query: 'lofi' }),
    '/youtube?play=jfKfPfyJRdk&mode=music&q=lofi'
  );
});
