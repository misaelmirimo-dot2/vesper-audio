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
  { to: '/library', label: 'My Library', icon: Library },
  { to: '/downloads', label: 'Downloads', icon: Download },
  { to: '/playlists', label: 'Playlists', icon: ListMusic },
  { to: '/admin', label: 'Admin', icon: Shield },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const MOBILE_NAV = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/youtube', label: 'YouTube', icon: Video },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/downloads', label: 'Downloads', icon: Download },
];

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { firebaseUser, profile, authError, signInWithGoogle, signOut } = useAuth();
  const { simulatedOffline, setSimulatedOffline } = useLibrary();
  const isOnline = useOnlineStatus(simulatedOffline);
  const currentTrack = usePlayerStore((s) => s.queue[s.currentIndex]);

  return (
    <div className="min-h-screen flex bg-[#0E0E12] text-[#F5F5F7]">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex md:w-60 lg:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-[#22222E] bg-[#121217] ${
          currentTrack ? 'pb-[76px]' : ''
        }`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-[#22222E]">
          <Link
            to="/"
            className="font-display text-lg font-bold tracking-tight text-[#F5F5F7] whitespace-nowrap shrink-0"
          >
            Vesper Audio
          </Link>
        </div>

        <nav
          aria-label="Primary desktop navigation"
          className="flex-1 space-y-1 px-3 py-4 overflow-y-auto"
        >
          {DESKTOP_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-violet-600/15 text-violet-300'
                      : 'text-[#9494A3] hover:bg-[#191922] hover:text-[#F5F5F7]'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-[#22222E] p-4 space-y-3">
          <PWAInstallButton />

          {firebaseUser ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-[#262632] bg-[#16161D] px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-[#F5F5F7]">
                  {profile?.username || firebaseUser.displayName || 'Listener'}
                </p>
                <p className="truncate text-[11px] text-[#9494A3]">
                  {firebaseUser.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                aria-label="Sign out"
                className="p-1.5 text-[#9494A3] hover:text-white rounded-md"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#2A2A38] bg-[#181820] px-3 py-2 text-xs font-medium text-[#F5F5F7] hover:border-violet-500/50 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5 text-violet-400" />
                <span>Sign in with Google</span>
              </button>
              {authError && (
                <p role="alert" className="text-[11px] leading-snug text-rose-400">
                  {authError}
                </p>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-60 lg:pl-64 min-w-0">
        {/* Mobile Top Bar (non-sticky so mobile fixed chrome stays <15%) */}
        <header className="md:hidden flex h-12 items-center justify-between border-b border-[#22222E] bg-[#0E0E12] px-4">
          <Link
            to="/"
            className="font-display text-base font-bold text-[#F5F5F7] whitespace-nowrap shrink-0"
          >
            Vesper Audio
          </Link>
          <div className="flex items-center gap-2">
            <PWAInstallButton compact />
            <Link
              to="/settings"
              aria-label="Open settings"
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-[#9494A3] hover:text-white"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        </header>

        <OfflineBanner
          isOnline={isOnline}
          simulatedOffline={simulatedOffline}
          onExitSimulated={() => void setSimulatedOffline(false)}
        />

        <main
          className={`flex-1 px-4 sm:px-6 lg:px-10 py-6 max-w-7xl w-full mx-auto ${
            currentTrack ? 'pb-36 md:pb-28' : 'pb-20 md:pb-12'
          }`}
        >
          {children}
        </main>
      </div>

      <GlobalPlayer />

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="Primary mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 h-12 border-t border-[#262632] bg-[#121217]/95 backdrop-blur-md"
      >
        {MOBILE_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
                  isActive ? 'text-violet-400' : 'text-[#9494A3]'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
