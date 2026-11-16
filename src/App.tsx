import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext.tsx';
import { LibraryProvider } from './context/LibraryContext.tsx';
import { AppLayout } from './components/AppLayout.tsx';

const HomePage = lazy(() =>
  import('./pages/HomePage.tsx').then((m) => ({ default: m.HomePage }))
);
const SearchPage = lazy(() =>
  import('./pages/SearchPage.tsx').then((m) => ({ default: m.SearchPage }))
);
const YouTubePage = lazy(() =>
  import('./pages/YouTubePage.tsx').then((m) => ({ default: m.YouTubePage }))
);
const TrackDetailPage = lazy(() =>
  import('./pages/DetailPages.tsx').then((m) => ({ default: m.TrackDetailPage }))
);
const ArtistDetailPage = lazy(() =>
  import('./pages/DetailPages.tsx').then((m) => ({ default: m.ArtistDetailPage }))
);
const AlbumDetailPage = lazy(() =>
  import('./pages/DetailPages.tsx').then((m) => ({ default: m.AlbumDetailPage }))
);
const LibraryPage = lazy(() =>
  import('./pages/LibraryPage.tsx').then((m) => ({ default: m.LibraryPage }))
);
const PlaylistsPage = lazy(() =>
  import('./pages/PlaylistsPage.tsx').then((m) => ({ default: m.PlaylistsPage }))
);
const PlaylistDetailPage = lazy(() =>
  import('./pages/PlaylistDetailPage.tsx').then((m) => ({
    default: m.PlaylistDetailPage,
  }))
);
const DownloadsPage = lazy(() =>
  import('./pages/DownloadsPage.tsx').then((m) => ({ default: m.DownloadsPage }))
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage.tsx').then((m) => ({ default: m.SettingsPage }))
);
const AdminPage = lazy(() =>
  import('./pages/AdminPage.tsx').then((m) => ({ default: m.AdminPage }))
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const RouteFallback = () => (
  <div className="space-y-4">
    <div className="h-8 w-48 rounded-lg bg-[#15151B] animate-pulse" />
    <div className="h-48 rounded-2xl bg-[#15151B] animate-pulse" />
  </div>
);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LibraryProvider>
          <BrowserRouter>
            <AppLayout>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<HomePage mode="home" />} />
                  <Route
                    path="/discover"
                    element={<HomePage mode="discover" />}
                  />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/youtube" element={<YouTubePage />} />
                  <Route path="/track/:id" element={<TrackDetailPage />} />
                  <Route path="/artist/:id" element={<ArtistDetailPage />} />
                  <Route path="/album/:id" element={<AlbumDetailPage />} />
                  <Route path="/library" element={<LibraryPage />} />
                  <Route path="/playlists" element={<PlaylistsPage />} />
                  <Route path="/playlists/:id" element={<PlaylistDetailPage />} />
                  <Route path="/downloads" element={<DownloadsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                </Routes>
              </Suspense>
            </AppLayout>
          </BrowserRouter>
        </LibraryProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
