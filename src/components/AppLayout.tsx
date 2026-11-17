import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Compass,
  Download,
  Home,
  Library,
  ListMusic,
  LogIn,
  LogOut,
  Search,
  Settings,
  Shield,
  Video,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useLibrary } from '../context/LibraryContext.tsx';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';
import { usePlayerStore } from '../store/usePlayerStore.ts';
import { OfflineBanner } from './OfflineBanner.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';
import { GlobalPlayer } from './GlobalPlayer.tsx';

const DESKTOP_NAV = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/youtube', label: 'YouTube', icon: Video },
];

const DESKTOP_LIBRARY_NAV = [
  { to: '/library', label: 'Your Library', icon: Library },
  { to: '/playlists', label: 'Playlists', icon: ListMusic },
  { to: '/downloads', label: 'Offline Locker', icon: Download },
  { to: '/admin', label: 'Governance', icon: Shield },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const MOBILE_NAV = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/youtube', label: 'YouTube', icon: Video },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/downloads', label: 'Offline', icon: Download },
];

const VesperBrandMark: React.FC<{ className?: string }> = ({
  className = 'w-7 h-7',
}) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    aria-hidden="true"
    className={className}
  >
    <circle cx="16" cy="16" r="16" fill="#1ED760" />
    <path
      d="M9 12.2C13.6 10.9 18.8 11.1 23 13.4"
      stroke="#000000"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <path
      d="M10.2 16.5C14 15.5 18.2 15.7 21.6 17.5"
      stroke="#000000"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path
      d="M11.6 20.6C14.4 19.9 17.5 20.1 20 21.4"
      stroke="#000000"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { firebaseUser, profile, authError, signInWithGoogle, signOut } = useAuth();
  const { simulatedOffline, setSimulatedOffline } = useLibrary();
  const isOnline = useOnlineStatus(simulatedOffline);
  const currentTrack = usePlayerStore((s) => s.queue[s.currentIndex]);

  const userInitial = (
    profile?.username ||
    firebaseUser?.displayName ||
    firebaseUser?.email ||
    'V'
  )
    .charAt(0)
    .toUpperCase();

  return (
    <div className="min-h-screen flex bg-[#121212] text-white">
      {/* Desktop Spotify Sidebar (Pure Black Rail + #121212 Cards) */}
      <aside
        className={`hidden md:flex md:w-64 lg:w-[272px] md:flex-col md:fixed md:inset-y-0 bg-black p-2 gap-2 ${
          currentTrack ? 'pb-[92px]' : ''
        }`}
      >
        {/* Top Primary Navigation Box */}
        <div className="rounded-xl bg-[#121212] px-3 py-3 space-y-1">
          <Link
            to="/"
            className="flex items-center gap-2.5 px-3 py-2 mb-1 font-display text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            <VesperBrandMark className="w-7 h-7 shrink-0" />
            <span>Vesper Audio</span>
          </Link>

          <nav aria-label="Primary desktop navigation" className="space-y-0.5">
            {DESKTOP_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap ${
                      isActive
                        ? 'text-white bg-[#242424]'
                        : 'text-[#B3B3B3] hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`w-5 h-5 shrink-0 ${
                          isActive ? 'text-[#1ED760]' : ''
                        }`}
                      />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Lower Library & Account Box */}
        <div className="flex-1 flex flex-col rounded-xl bg-[#121212] overflow-hidden">
          <nav
            aria-label="Library and settings navigation"
            className="flex-1 space-y-0.5 px-3 py-3 overflow-y-auto"
          >
            <p className="px-3 pb-2 text-xs font-semibold text-[#B3B3B3]">
              Library &amp; Tools
            </p>
            {DESKTOP_LIBRARY_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap ${
                      isActive
                        ? 'text-white bg-[#242424]'
                        : 'text-[#B3B3B3] hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`w-5 h-5 shrink-0 ${
                          isActive ? 'text-[#1ED760]' : ''
                        }`}
                      />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-3 space-y-2.5">
            <PWAInstallButton />

            {firebaseUser ? (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-[#242424] px-3 py-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1ED760] text-xs font-bold text-black">
                    {userInitial}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-white">
                      {profile?.username || firebaseUser.displayName || 'Listener'}
                    </p>
                    <p className="truncate text-[11px] text-[#B3B3B3]">
                      {firebaseUser.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  aria-label="Sign out"
                  className="p-1.5 text-[#B3B3B3] hover:text-white rounded-full transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => void signInWithGoogle()}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-black hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Log in with Google</span>
                </button>
                {authError && (
                  <p role="alert" className="text-[11px] leading-snug text-rose-400">
                    {authError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 lg:pl-[272px] min-w-0 bg-[#121212]">
        {/* Mobile Top Bar (Compact 48px Spotify iOS Header) */}
        <header className="md:hidden flex h-12 items-center justify-between bg-[#121212]/90 backdrop-blur-xl px-4 sticky top-0 z-20">
          <Link
            to="/"
            className="font-display text-base font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2"
          >
            <VesperBrandMark className="w-6 h-6 shrink-0" />
            <span>Vesper Audio</span>
          </Link>
          <div className="flex items-center gap-2">
            <PWAInstallButton compact />
            <Link
              to="/playlists"
              aria-label="Open playlists"
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-[#B3B3B3] hover:text-white"
            >
              <ListMusic className="w-5 h-5" />
            </Link>
            <Link
              to="/settings"
              aria-label="Open settings"
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-[#B3B3B3] hover:text-white"
            >
              {firebaseUser ? (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1ED760] text-xs font-bold text-black">
                  {userInitial}
                </span>
              ) : (
                <Settings className="w-5 h-5" />
              )}
            </Link>
          </div>
        </header>

        <OfflineBanner
          isOnline={isOnline}
          simulatedOffline={simulatedOffline}
          onExitSimulated={() => void setSimulatedOffline(false)}
        />

        <main
          className={`flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl w-full mx-auto ${
            currentTrack ? 'pb-40 md:pb-28' : 'pb-24 md:pb-12'
          }`}
        >
          {children}
        </main>
      </div>

      <GlobalPlayer />

      {/* Mobile Bottom Tab Bar (Spotify iOS Translucent Gradient Bar, 56px height) */}
      <nav
        aria-label="Primary mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 h-14 pb-safe bg-gradient-to-t from-black via-black/95 to-black/80 backdrop-blur-xl border-t border-white/[0.06]"
      >
        {MOBILE_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 min-h-[44px] text-[10px] font-medium transition-colors ${
                  isActive ? 'text-white font-semibold' : 'text-[#B3B3B3]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-5 h-5 ${
                      isActive ? 'text-[#1ED760]' : 'text-[#B3B3B3]'
                    }`}
                    strokeWidth={isActive ? 2.4 : 1.8}
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
