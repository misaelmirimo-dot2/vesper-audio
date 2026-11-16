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
  Moon,
  Search,
  Settings,
  Shield,
  Sun,
  Video,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useLibrary } from '../context/LibraryContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
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
  const { theme, toggleTheme } = useTheme();
  const isOnline = useOnlineStatus(simulatedOffline);
  const currentTrack = usePlayerStore((s) => s.queue[s.currentIndex]);

  return (
    <div className="min-h-screen flex bg-[var(--bg-canvas)] text-[var(--text-primary)] transition-colors duration-300">
      {/* Desktop Sidebar with Apple Liquid Glass */}
      <aside
        className={`hidden md:flex md:w-60 lg:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-[var(--border-hairline)] liquid-glass z-20 ${
          currentTrack ? 'pb-[76px]' : ''
        }`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-[var(--border-hairline)]">
          <Link
            to="/"
            className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)] whitespace-nowrap shrink-0 flex items-center gap-2"
          >
            <span className="flex h-3 w-3 rounded-full bg-[#fa233b] shadow-sm shadow-[#fa233b]/50 animate-pulse" />
            Vesper Audio
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 text-[#fa233b]" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>
        </div>

        <nav
          aria-label="Primary desktop navigation"
          className="flex-1 space-y-1.5 px-3 py-5 overflow-y-auto"
        >
          {DESKTOP_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-[#fa233b]/15 text-[#fa233b] font-semibold shadow-sm'
                      : 'text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-primary)]'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-[var(--border-hairline)] p-4 space-y-3">
          <PWAInstallButton />

          {firebaseUser ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 py-2.5 shadow-sm">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
                  {profile?.username || firebaseUser.displayName || 'Listener'}
                </p>
                <p className="truncate text-[11px] text-[var(--text-secondary)]">
                  {firebaseUser.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                aria-label="Sign out"
                className="p-1.5 text-[var(--text-secondary)] hover:text-[#fa233b] rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-2.5 text-xs font-medium text-[var(--text-primary)] hover:border-[#fa233b]/50 shadow-sm transition-all hover-glass-lift"
              >
                <LogIn className="w-3.5 h-3.5 text-[#fa233b]" />
                <span>Sign in with Google</span>
              </button>
              {authError && (
                <p role="alert" className="text-[11px] leading-snug text-rose-500">
                  {authError}
                </p>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-60 lg:pl-64 min-w-0">
        {/* Mobile Top Bar */}
        <header className="md:hidden flex h-14 items-center justify-between border-b border-[var(--border-hairline)] liquid-glass px-4 sticky top-0 z-20">
          <Link
            to="/"
            className="font-display text-base font-bold text-[var(--text-primary)] whitespace-nowrap shrink-0 flex items-center gap-2"
          >
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#fa233b]" />
            Vesper Audio
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-[#fa233b]" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>
            <PWAInstallButton compact />
            <Link
              to="/settings"
              aria-label="Open settings"
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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

      {/* Mobile Bottom Tab Bar with Liquid Glass */}
      <nav
        aria-label="Primary mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 h-13 border-t border-[var(--border-hairline)] liquid-glass"
      >
        {MOBILE_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-[#fa233b]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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
