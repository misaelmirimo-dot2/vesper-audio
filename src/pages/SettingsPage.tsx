import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogIn, LogOut, ShieldAlert, User, WifiOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useLibrary } from '../context/LibraryContext.tsx';
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
        <h1 className="font-display text-2xl font-bold text-[#F5F5F7]">
          Account &amp; Settings
        </h1>
        <p className="mt-1 text-sm text-[#9494A3]">
          Manage your profile, Creative Commons licensing mode, and offline PWA
          preferences.
        </p>
      </div>

      {/* Account Card */}
      <section className="rounded-xl border border-[#22222E] bg-[#15151B] p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#1E1E28] border border-[#2A2A38] flex items-center justify-center">
              <User className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#F5F5F7]">
                {firebaseUser
                  ? profile?.username || firebaseUser.displayName || 'Listener'
                  : 'Local Offline Profile'}
              </h2>
              <p className="text-xs text-[#9494A3]">
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
              className="inline-flex items-center gap-2 rounded-lg border border-[#2A2A38] px-4 py-2 text-xs font-medium text-[#F5F5F7] hover:bg-[#1C1C24]"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-medium text-white hover:bg-sky-500"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign in with Google
            </button>
          )}
        </div>

        {authError && (
          <p className="text-xs text-rose-400">{authError}</p>
        )}

        {firebaseUser && (
          <form
            onSubmit={handleSubmit(onSaveProfile)}
            className="border-t border-[#22222E] pt-5 space-y-4"
          >
            <div>
              <label
                htmlFor="profile-username"
                className="block text-xs text-[#9494A3] mb-1.5"
              >
                Display Name
              </label>
              <input
                id="profile-username"
                type="text"
                {...register('username')}
                className="w-full rounded-lg border border-[#2A2A38] bg-[#0E0E12] px-3.5 py-2 text-sm text-[#F5F5F7] focus:border-sky-500 focus:outline-none"
              />
              {errors.username && (
                <p className="mt-1 text-xs text-rose-400">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="profile-bio"
                className="block text-xs text-[#9494A3] mb-1.5"
              >
                Listener Bio
              </label>
              <textarea
                id="profile-bio"
                rows={2}
                {...register('bio')}
                className="w-full rounded-lg border border-[#2A2A38] bg-[#0E0E12] px-3.5 py-2 text-sm text-[#F5F5F7] focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-medium text-white hover:bg-sky-500"
              >
                Save Profile
              </button>
              {savedNotice && (
                <span className="text-xs text-emerald-400">
                  Profile saved to PostgreSQL.
                </span>
              )}
            </div>
          </form>
        )}
      </section>

      {/* Licensing & Offline Controls */}
      <section className="rounded-xl border border-[#22222E] bg-[#15151B] divide-y divide-[#22222E]">
        <div className="flex items-center justify-between gap-4 p-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-[#F5F5F7]">
              <ShieldAlert className="w-4 h-4 text-sky-400" />
              <span>Commercial Use Enforcement Mode</span>
            </div>
            <p className="text-xs text-[#9494A3]">
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
              commercialUseMode ? 'bg-sky-600' : 'bg-[#2A2A38]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                commercialUseMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 p-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-[#F5F5F7]">
              <WifiOff className="w-4 h-4 text-amber-400" />
              <span>Offline Mode Preview</span>
            </div>
            <p className="text-xs text-[#9494A3]">
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
              simulatedOffline ? 'bg-amber-500' : 'bg-[#2A2A38]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                simulatedOffline ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm font-medium text-[#F5F5F7]">
              Progressive Web App Installation
            </p>
            <p className="text-xs text-[#9494A3]">
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
