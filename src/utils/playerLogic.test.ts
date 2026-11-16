import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeTotalDuration,
  formatBytes,
  formatDuration,
  getNextQueueIndex,
  getPreviousQueueIndex,
  reorderList,
} from './playerLogic.ts';

test('formatDuration formats seconds as m:ss cleanly', () => {
  assert.equal(formatDuration(0), '0:00');
  assert.equal(formatDuration(9), '0:09');
  assert.equal(formatDuration(125), '2:05');
  assert.equal(formatDuration(-5), '0:00');
});

test('formatBytes formats byte sizes cleanly', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.equal(formatBytes(2 * 1024 * 1024), '2.00 MB');
});

test('getNextQueueIndex handles repeat modes and shuffle', () => {
  assert.equal(
    getNextQueueIndex({ currentIndex: 2, queueLength: 3, repeat: 'off', shuffle: false }),
    null
  );
  assert.equal(
    getNextQueueIndex({ currentIndex: 2, queueLength: 3, repeat: 'all', shuffle: false }),
    0
  );
  assert.equal(
    getNextQueueIndex({ currentIndex: 1, queueLength: 3, repeat: 'one', shuffle: false }),
    1
  );
  const shuffled = getNextQueueIndex({
    currentIndex: 1,
    queueLength: 4,
    repeat: 'off',
    shuffle: true,
    randomFn: () => 0.25, // collides with 1 -> shifts to 2
  });
  assert.equal(shuffled, 2);
});

test('getPreviousQueueIndex wraps when repeat all is active', () => {
  assert.equal(
    getPreviousQueueIndex({ currentIndex: 0, queueLength: 3, repeat: 'all' }),
    2
  );
  assert.equal(
    getPreviousQueueIndex({ currentIndex: 2, queueLength: 3, repeat: 'off' }),
    1
  );
});

test('reorderList and computeTotalDuration behave deterministically', () => {
  assert.deepEqual(reorderList(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a']);
  assert.equal(
    computeTotalDuration([{ duration: 20 }, { duration: 45 }, { duration: 15 }]),
    80
  );
});
