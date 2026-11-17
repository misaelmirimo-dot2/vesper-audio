import test from 'node:test';
import assert from 'node:assert/strict';
import { getGenreTileColor, getGreetingForHour } from './spotifyTheme';

test('getGenreTileColor returns deterministic valid hex color and distinct adjacent colors by index', () => {
  const a = getGenreTileColor('Ambient');
  const b = getGenreTileColor('ambient');
  assert.equal(a, b);
  assert.match(a, /^#[0-9A-F]{6}$/i);

  const c0 = getGenreTileColor('Ambient', 0);
  const c1 = getGenreTileColor('Electronic', 1);
  const c2 = getGenreTileColor('Indie', 2);
  assert.notEqual(c0, c1);
  assert.notEqual(c1, c2);
});

test('getGreetingForHour returns expected Spotify greetings', () => {
  assert.equal(getGreetingForHour(8), 'Good morning');
  assert.equal(getGreetingForHour(14), 'Good afternoon');
  assert.equal(getGreetingForHour(21), 'Good evening');
  assert.equal(getGreetingForHour(2), 'Good evening');
});
