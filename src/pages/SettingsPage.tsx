import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  LogIn,
  LogOut,
  Moon,
  ShieldAlert,
  Sun,
  User,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useLibrary } from '../context/LibraryContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { PWAInstallButton } from '../components/PWAInstallButton.tsx';

const profileSchema = z.object({
  username: z.string().trim().min(2, 'Username must be at least 2 characters').max(60),
  bio: z.string().trim().max(300).optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export const SettingsPage: React.FC = () => {
  const { firebaseUser, profile, authError, signInWithGoogle, signOut, updateProfile } =
    useAuth();
  const {
    commercialUseMode,
    setCommercialUseMode,
    simulatedOffline,
    setSimulatedOffline,
  } = useLibrary();
  const { theme, toggleTheme } = useTheme();

  const [savedNotice, setSavedNotice] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: profile?.username || '',
      bio: profile?.bio || '',
    },
  });

  useEffect(() => {
    if (profile) {
      reset({ username: profile.username, bio: profile.bio || '' });
    }
  }, [profile, reset]);

  const onSaveProfile = async (values: ProfileForm) => {
    setSavedNotice(false);
    await updateProfile({
      username: values.username,
      bio: values.bio || '',
    });
    setSavedNotice(true);
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
          Account &amp; Settings
        </h1>
        <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
          Manage your Apple Music style light/dark appearance, Creative Commons
          licensing mode, and offline PWA preferences.
        </p>
      </div>

      {/* Appearance & Theme Section */}
      <section className="rounded-2xl border border-[var(--border-hairline)] liquid-glass-card p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
              {theme === 'light' ? (
                <Sun className="w-5 h-5 text-amber-500" />
              ) : (
                <Moon className="w-5 h-5 text-[#fa233b]" />
              )}
              Appearance Mode
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Choose between Apple Music style clean Light Mode or Dark Mode.
            </p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-4 py-2.5 text-xs font-medium text-[var(--text-primary)] hover:border-[#fa233b]/50 shadow-sm transition-all hover-glass-lift"
          >
            {theme === 'light' ? (
              <>
                <Moon className="w-4 h-4 text-[#fa233b]" />
                <span>Switch to Dark Mode</span>
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Switch to Light Mode</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* Account Card */}
      <section className="rounded-2xl border border-[var(--border-hairline)] liquid-glass-card p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] flex items-center justify-center">
              <User className="w-5 h-5 text-[#fa233b]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                {firebaseUser
                  ? profile?.username || firebaseUser.displayName || 'Listener'
                  : 'Local Offline Profile'}
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {firebaseUser
                  ? firebaseUser.email
                  : 'Sign in with Google to sync playlists, favorites, and download records to PostgreSQL.'}
              </p>
            </div>
          </div>

          {firebaseUser ? (
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-hairline)] px-4 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#fa233b] px-4 py-2 text-xs font-medium text-white hover:bg-[#e01e33] transition-transform hover:scale-105 shadow-md shadow-[#fa233b]/25"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign in with Google
            </button>
          )}
        </div>

        {authError && (
          <p className="text-xs text-rose-500">{authError}</p>
        )}

        {firebaseUser && (
          <form
            onSubmit={handleSubmit(onSaveProfile)}
            className="border-t border-[var(--border-hairline)] pt-5 space-y-4"
          >
            <div>
              <label
                htmlFor="profile-username"
                className="block text-xs text-[var(--text-secondary)] mb-1.5"
              >
                Display Name
              </label>
              <input
                id="profile-username"
                type="text"
                {...register('username')}
                className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[#fa233b] focus:outline-none"
              />
              {errors.username && (
                <p className="mt-1 text-xs text-rose-500">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="profile-bio"
                className="block text-xs text-[var(--text-secondary)] mb-1.5"
              >
                Listener Bio
              </label>
              <textarea
                id="profile-bio"
                rows={2}
                {...register('bio')}
                className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[#fa233b] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-[#fa233b] px-4 py-2 text-xs font-medium text-white hover:bg-[#e01e33] transition-colors"
              >
                Save Profile
              </button>
              {savedNotice && (
                <span className="text-xs text-emerald-500">
                  Profile saved to PostgreSQL.
                </span>
              )}
            </div>
          </form>
        )}
      </section>

      {/* Licensing & Offline Controls */}
      <section className="rounded-2xl border border-[var(--border-hairline)] liquid-glass-card divide-y divide-[var(--border-hairline)]">
        <div className="flex items-center justify-between gap-4 p-5 sm:p-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
              <ShieldAlert className="w-4 h-4 text-[#fa233b]" />
              <span>Commercial Use Enforcement Mode</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              When enabled, offline downloads for Non-Commercial licences (CC
              BY-NC, CC BY-NC-SA, CC BY-NC-ND) are strictly blocked.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={commercialUseMode}
            aria-label="Toggle Commercial Use Enforcement Mode"
            onClick={() => void setCommercialUseMode(!commercialUseMode)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              commercialUseMode ? 'bg-[#fa233b]' : 'bg-[var(--border-hairline)]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                commercialUseMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 p-5 sm:p-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
              <WifiOff className="w-4 h-4 text-amber-500" />
              <span>Offline Mode Preview</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Simulate disconnecting from the network to verify offline Cache
              Storage playback and saved playlists.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={simulatedOffline}
            aria-label="Toggle Offline Mode Preview"
            onClick={() => void setSimulatedOffline(!simulatedOffline)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              simulatedOffline ? 'bg-amber-500' : 'bg-[var(--border-hairline)]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                simulatedOffline ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 p-5 sm:p-6">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Progressive Web App Installation
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Install Vesper Audio for standalone windowing and iOS/Android
              offline shell caching.
            </p>
          </div>
          <PWAInstallButton />
        </div>
      </section>
    </div>
  );
};
