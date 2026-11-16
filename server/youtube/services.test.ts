import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractVideoRenderersFromInitialData,
  filterCuratedYouTube,
  parseIso8601Duration,
} from './services.ts';

test('parseIso8601Duration formats YouTube ISO durations cleanly', () => {
  assert.equal(parseIso8601Duration('PT4M13S'), '4:13');
  assert.equal(parseIso8601Duration('PT1H02M05S'), '1:02:05');
  assert.equal(parseIso8601Duration('PT45S'), '0:45');
  assert.equal(parseIso8601Duration(undefined), '');
});

test('extractVideoRenderersFromInitialData extracts normalized video entries', () => {
  const sampleData = {
    contents: {
      twoColumnSearchResultsRenderer: {
        primaryContents: {
          sectionListRenderer: {
            contents: [
              {
                itemSectionRenderer: {
                  contents: [
                    {
                      videoRenderer: {
                        videoId: 'abc123XYZ00',
                        title: { runs: [{ text: 'Midnight Synth Session' }] },
                        ownerText: { runs: [{ text: 'Studio Archive' }] },
                        lengthText: { simpleText: '12:34' },
                        shortViewCountText: { simpleText: '42K views' },
                        publishedTimeText: { simpleText: '3 days ago' },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    },
  };

  const results = extractVideoRenderersFromInitialData(sampleData, 10);
  assert.equal(results.length, 1);
  assert.equal(results[0].videoId, 'abc123XYZ00');
  assert.equal(results[0].title, 'Midnight Synth Session');
  assert.equal(results[0].channelTitle, 'Studio Archive');
  assert.equal(results[0].durationLabel, '12:34');
  assert.equal(
    results[0].embedUrl,
    'https://www.youtube-nocookie.com/embed/abc123XYZ00?autoplay=1&rel=0'
  );
});

test('filterCuratedYouTube filters by query and live category', () => {
  const live = filterCuratedYouTube('', 'live');
  assert.ok(live.length > 0);
  assert.ok(live.every((v) => v.category === 'live'));

  const synth = filterCuratedYouTube('synthwave', 'all');
  assert.ok(synth.some((v) => v.title.toLowerCase().includes('synthwave')));
});
