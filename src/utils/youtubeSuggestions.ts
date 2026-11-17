export const YOUTUBE_SUGGESTED_QUERIES = [
  'Congolese Rumba',
  'Afrobeat',
  'Ndombolo',
  'Lofi Beats',
  'Live Sessions',
  'Electronic',
  'Acoustic',
  'Jazz',
] as const;

export interface YouTubeTopicCategory {
  label: string;
  query: string;
  filter: 'all' | 'music' | 'live';
}

export const YOUTUBE_BROWSE_CATEGORIES: YouTubeTopicCategory[] = [
  { label: 'Congolese Rumba', query: 'congolese rumba official music', filter: 'music' },
  { label: 'Afrobeat', query: 'afrobeat official music video', filter: 'music' },
  { label: 'Ndombolo', query: 'ndombolo dance music video', filter: 'music' },
  { label: 'Lofi Beats', query: 'lofi hip hop beats radio', filter: 'all' },
  { label: 'Live Sessions', query: 'live music studio session', filter: 'live' },
  { label: 'Synthwave', query: 'synthwave chill electronic mix', filter: 'music' },
  { label: 'Acoustic', query: 'acoustic guitar live session', filter: 'music' },
  { label: 'Jazz Quartet', query: 'late night jazz quartet live', filter: 'music' },
];

export function buildYouTubePlayUrl(params: {
  videoId: string;
  mode?: 'video' | 'music';
  query?: string;
}): string {
  const qs = new URLSearchParams();
  qs.set('play', params.videoId);
  if (params.mode === 'music') {
    qs.set('mode', 'music');
  }
  if (params.query?.trim()) {
    qs.set('q', params.query.trim());
  }
  return `/youtube?${qs.toString()}`;
}
