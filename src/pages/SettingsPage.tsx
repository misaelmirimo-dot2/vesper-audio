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
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
          Settings
        </h1>
        <p className="mt-1 text-sm text-[#B3B3B3]">
          Manage your account, licensing preferences, and offline PWA mode.
        </p>
      </div>

      {/* Account Card */}
      <section className="rounded-2xl bg-[#181818] p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[#242424] flex items-center justify-center">
              <User className="w-5 h-5 text-[#1ED760]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {firebaseUser
                  ? profile?.username || firebaseUser.displayName || 'Listener'
                  : 'Local Offline Profile'}
              </h2>
              <p className="text-xs text-[#B3B3B3]">
                {firebaseUser
                  ? firebaseUser.email
                  : 'Log in with Google to sync playlists, favorites, and offline history.'}
              </p>
            </div>
          </div>

          {firebaseUser ? (
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-2 rounded-full bg-[#242424] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#303030] min-h-[40px]"
            >
              <LogOut className="w-3.5 h-3.5" />
              Log out
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="inline-flex items-center gap-2 rounded-full bg-[#1ED760] px-5 py-2.5 text-xs font-bold text-black hover:bg-[#1FDF64] min-h-[40px]"
            >
              <LogIn className="w-3.5 h-3.5" />
              Log in with Google
            </button>
          )}
        </div>

        {authError && (
          <p className="text-xs text-rose-400">{authError}</p>
        )}

        {firebaseUser && (
          <form
            onSubmit={handleSubmit(onSaveProfile)}
            className="border-t border-white/10 pt-5 space-y-4"
          >
            <div>
              <label
                htmlFor="profile-username"
                className="block text-xs font-semibold text-[#B3B3B3] mb-1.5"
              >
                Display Name
              </label>
              <input
                id="profile-username"
                type="text"
                {...register('username')}
                className="w-full rounded-lg bg-[#242424] border border-white/10 px-3.5 py-2.5 text-sm text-white focus:border-[#1ED760] focus:outline-none min-h-[44px]"
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
                className="block text-xs font-semibold text-[#B3B3B3] mb-1.5"
              >
                Listener Bio
              </label>
              <textarea
                id="profile-bio"
                rows={2}
                {...register('bio')}
                className="w-full rounded-lg bg-[#242424] border border-white/10 px-3.5 py-2.5 text-sm text-white focus:border-[#1ED760] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-[#1ED760] px-5 py-2.5 text-xs font-bold text-black hover:bg-[#1FDF64] min-h-[40px]"
              >
                Save Profile
              </button>
              {savedNotice && (
                <span className="text-xs font-medium text-[#1ED760]">
                  Profile saved.
                </span>
              )}
            </div>
          </form>
        )}
      </section>

      {/* Licensing & Offline Controls */}
      <section className="rounded-2xl bg-[#181818] divide-y divide-white/[0.06]">
        <div className="flex items-center justify-between gap-4 p-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <ShieldAlert className="w-4 h-4 text-[#1ED760]" />
              <span>Commercial Use Enforcement Mode</span>
            </div>
            <p className="text-xs text-[#B3B3B3]">
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
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
              commercialUseMode ? 'bg-[#1ED760]' : 'bg-[#3E3E3E]'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                commercialUseMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 p-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <WifiOff className="w-4 h-4 text-[#1ED760]" />
              <span>Offline Mode Preview</span>
            </div>
            <p className="text-xs text-[#B3B3B3]">
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
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
              simulatedOffline ? 'bg-[#1ED760]' : 'bg-[#3E3E3E]'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                simulatedOffline ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm font-bold text-white">
              Progressive Web App Installation
            </p>
            <p className="text-xs text-[#B3B3B3]">
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
