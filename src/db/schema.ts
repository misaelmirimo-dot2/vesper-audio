import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  username: text('username').notNull(),
  email: text('email').notNull(),
  profileImage: text('profile_image'),
  bio: text('bio'),
  commercialUseMode: boolean('commercial_use_mode').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tracks = pgTable(
  'tracks',
  {
    id: serial('id').primaryKey(),
    provider: text('provider').notNull().default('jamendo'),
    providerTrackId: text('provider_track_id').notNull(),
    title: text('title').notNull(),
    artistName: text('artist_name').notNull(),
    artistId: text('artist_id').notNull(),
    albumName: text('album_name'),
    albumId: text('album_id'),
    artworkUrl: text('artwork_url'),
    duration: integer('duration').notNull(),
    genre: text('genre'),
    tags: jsonb('tags').$type<string[]>().default([]).notNull(),
    releaseDate: text('release_date'),
    isInstrumental: boolean('is_instrumental').notNull().default(false),
    streamingUrl: text('streaming_url').notNull(),
    downloadUrl: text('download_url'),
    originalTrackUrl: text('original_track_url').notNull(),
    downloadAllowed: boolean('download_allowed').notNull().default(false),
    licenseType: text('license_type').notNull(),
    licenseUrl: text('license_url'),
    licenseSummary: text('license_summary'),
    lastVerifiedAt: timestamp('last_verified_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('tracks_provider_track_idx').on(table.provider, table.providerTrackId),
  ]
);

export const playlists = pgTable('playlists', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  description: text('description'),
  artworkUrl: text('artwork_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const playlistTracks = pgTable('playlist_tracks', {
  id: serial('id').primaryKey(),
  playlistId: integer('playlist_id')
    .references(() => playlists.id, { onDelete: 'cascade' })
    .notNull(),
  trackId: integer('track_id')
    .references(() => tracks.id, { onDelete: 'cascade' })
    .notNull(),
  position: integer('position').notNull().default(0),
  addedAt: timestamp('added_at').defaultNow().notNull(),
});

export const favorites = pgTable(
  'favorites',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    trackId: integer('track_id')
      .references(() => tracks.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('favorites_user_track_idx').on(table.userId, table.trackId),
  ]
);

export const savedCollections = pgTable(
  'saved_collections',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    collectionType: text('collection_type').notNull(),
    providerId: text('provider_id').notNull(),
    name: text('name').notNull(),
    subtitle: text('subtitle'),
    artworkUrl: text('artwork_url'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('saved_collections_user_type_idx').on(
      table.userId,
      table.collectionType,
      table.providerId
    ),
  ]
);

export const listeningHistory = pgTable('listening_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  trackId: integer('track_id')
    .references(() => tracks.id, { onDelete: 'cascade' })
    .notNull(),
  playedAt: timestamp('played_at').defaultNow().notNull(),
  playbackPosition: integer('playback_position').notNull().default(0),
});

export const downloadRecords = pgTable(
  'download_records',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    trackId: integer('track_id')
      .references(() => tracks.id, { onDelete: 'cascade' })
      .notNull(),
    localDownloadStatus: text('local_download_status').notNull().default('authorized'),
    fileSizeBytes: integer('file_size_bytes').notNull().default(0),
    licenseType: text('license_type').notNull(),
    licenseVerifiedAt: timestamp('license_verified_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('download_records_user_track_idx').on(table.userId, table.trackId),
  ]
);

export const appSettings = pgTable('app_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  downloadsEnabledGlobally: boolean('downloads_enabled_globally').notNull().default(true),
  apiCacheTtlSeconds: integer('api_cache_ttl_seconds').notNull().default(300),
  commercialModeEnforced: boolean('commercial_mode_enforced').notNull().default(false),
  featureFlags: jsonb('feature_flags').$type<Record<string, boolean>>().default({}).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const apiLogs = pgTable('api_logs', {
  id: serial('id').primaryKey(),
  eventType: text('event_type').notNull(),
  endpoint: text('endpoint').notNull(),
  statusCode: integer('status_code'),
  detail: text('detail'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  playlists: many(playlists),
  favorites: many(favorites),
  savedCollections: many(savedCollections),
  listeningHistory: many(listeningHistory),
  downloadRecords: many(downloadRecords),
}));

export const playlistsRelations = relations(playlists, ({ one, many }) => ({
  owner: one(users, {
    fields: [playlists.userId],
    references: [users.id],
  }),
  items: many(playlistTracks),
}));

export const playlistTracksRelations = relations(playlistTracks, ({ one }) => ({
  playlist: one(playlists, {
    fields: [playlistTracks.playlistId],
    references: [playlists.id],
  }),
  track: one(tracks, {
    fields: [playlistTracks.trackId],
    references: [tracks.id],
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
  track: one(tracks, {
    fields: [favorites.trackId],
    references: [tracks.id],
  }),
}));

export const downloadRecordsRelations = relations(downloadRecords, ({ one }) => ({
  user: one(users, {
    fields: [downloadRecords.userId],
    references: [users.id],
  }),
  track: one(tracks, {
    fields: [downloadRecords.trackId],
    references: [tracks.id],
  }),
}));

export const youtubeFavorites = pgTable(
  'youtube_favorites',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    videoId: text('video_id').notNull(),
    title: text('title').notNull(),
    channelTitle: text('channel_title').notNull(),
    description: text('description').default('').notNull(),
    thumbnailUrl: text('thumbnail_url').notNull(),
    publishedAt: text('published_at').default('').notNull(),
    durationLabel: text('duration_label').default('Video').notNull(),
    viewCountLabel: text('view_count_label').default('YouTube').notNull(),
    category: text('category').default('music').notNull(),
    embedUrl: text('embed_url').notNull(),
    watchUrl: text('watch_url').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('youtube_favorites_user_video_idx').on(
      table.userId,
      table.videoId
    ),
  ]
);

export const youtubePlaylists = pgTable('youtube_playlists', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  description: text('description').default('').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const youtubePlaylistItems = pgTable(
  'youtube_playlist_items',
  {
    id: serial('id').primaryKey(),
    playlistId: integer('playlist_id')
      .references(() => youtubePlaylists.id, { onDelete: 'cascade' })
      .notNull(),
    videoId: text('video_id').notNull(),
    title: text('title').notNull(),
    channelTitle: text('channel_title').notNull(),
    description: text('description').default('').notNull(),
    thumbnailUrl: text('thumbnail_url').notNull(),
    publishedAt: text('published_at').default('').notNull(),
    durationLabel: text('duration_label').default('Video').notNull(),
    viewCountLabel: text('view_count_label').default('YouTube').notNull(),
    category: text('category').default('music').notNull(),
    embedUrl: text('embed_url').notNull(),
    watchUrl: text('watch_url').notNull(),
    position: integer('position').notNull().default(0),
    addedAt: timestamp('added_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('youtube_playlist_items_pl_video_idx').on(
      table.playlistId,
      table.videoId
    ),
  ]
);
