const SPOTIFY_GENRE_COLORS = [
  '#1E3264', // Deep Navy
  '#006450', // Deep Emerald
  '#E8115B', // Magenta Rose
  '#0D73EC', // Spotify Blue
  '#BC5900', // Burnt Amber
  '#8D67AB', // Plum
  '#148A08', // Forest Green
  '#503750', // Aubergine
  '#477D95', // Slate Teal
  '#A56752', // Terracotta
];

export function getGenreTileColor(genre: string, index?: number): string {
  if (typeof index === 'number' && index >= 0) {
    return SPOTIFY_GENRE_COLORS[index % SPOTIFY_GENRE_COLORS.length];
  }
  const normalized = genre.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }
  return SPOTIFY_GENRE_COLORS[hash % SPOTIFY_GENRE_COLORS.length];
}

export function getGreetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  return 'Good evening';
}
