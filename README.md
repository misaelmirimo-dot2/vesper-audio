# Vesper Audio — Jamendo-Powered Offline Music Streaming PWA

A full-stack, offline-capable Progressive Web Application for discovering, streaming, organizing, and downloading Creative Commons independent music powered by the Jamendo v3.0 API, PostgreSQL (Cloud SQL + Drizzle ORM), Firebase Authentication, Browser Cache Storage, and Dexie.js IndexedDB.

## Architecture Overview

- **Frontend (`src/`)**: React 19, TypeScript, Vite, Tailwind CSS v4, React Router, TanStack Query, Zustand, React Hook Form + Zod, Dexie.js (IndexedDB), Browser Cache Storage API, Media Session API, and `vite-plugin-pwa` (Workbox).
- **Backend (`server.ts`, `server/jamendo/`, `src/db/`)**: Express REST API mediating all Jamendo v3.0 requests, server-side Creative Commons licence validation, sliding-window rate limiting on search, HTTP Range audio streaming, OpenAPI 3.0 spec (`/api/docs`), Firebase Admin ID token verification, and PostgreSQL persistence via Drizzle ORM.

## Jamendo API v3.0 Setup

Server-side credentials are never exposed to the frontend. Set these environment variables in `.env`:

```env
JAMENDO_CLIENT_ID="your_jamendo_client_id"
JAMENDO_CLIENT_SECRET="your_jamendo_client_secret"
JAMENDO_API_BASE_URL="https://api.jamendo.com/v3.0"
```

When `JAMENDO_CLIENT_ID` is not set, the backend automatically runs in **Development Catalog Mode**, serving a curated catalog of Creative Commons tracks with deterministic HTTP Range WAV previews so playback, seeking, licence validation, and offline Cache Storage downloads can be tested end-to-end without live external credentials.

## Database & Authentication

- **PostgreSQL Tables (`src/db/schema.ts`)**: `users`, `tracks`, `playlists`, `playlist_tracks`, `favorites`, `saved_collections`, `listening_history`, `download_records`, `app_settings`, and `api_logs`.
- **Firebase Authentication**: Google Sign-In (`signInWithPopup`) verified server-side with `firebase-admin` on protected endpoints (`/api/auth/me`, `/api/library/*`, `/api/playlists/*`, `/api/history`, `/api/downloads/record`).

## Scripts

- `npm run dev` — Starts the Express + Vite full-stack development server on port 3000.
- `npm run build` — Compiles the production Vite PWA bundle and Workbox service worker into `dist/`.
- `npm run lint` — Runs TypeScript type checking (`tsc --noEmit`).
- `npx tsx --test server/jamendo/licenseValidator.test.ts src/utils/playerLogic.test.ts` — Runs backend licensing and frontend queue unit tests.

## Manual Verification Checklist (iPhone Safari & Android Chrome)

1. **iPhone Safari**:
   - Open the HTTPS deployment URL in Safari.
   - Tap Share → Add to Home Screen, then launch from the Home Screen (`standalone` mode).
   - Verify the persistent mini-player stays unobstructed above the bottom tab bar and expands smoothly to the full-screen player.
   - Start playback, lock the screen, and verify lock-screen Media Session controls (Play, Pause, Next, Previous).
   - Download an authorized track, enable Airplane Mode, reopen the PWA, and play the cached track from **Downloads**.
2. **Android Chrome**:
   - Click the in-app **Install App** button (`beforeinstallprompt`) and verify home screen icon rendering (including maskable icon safe zone).
   - Test Search debouncing, Genre filtering, Playlist creation & track reordering, and lock-screen media notification controls.
   - Enable **Commercial Use Enforcement Mode** in Settings and verify `CC BY-NC*` downloads are blocked by `/api/downloads/authorize`.
