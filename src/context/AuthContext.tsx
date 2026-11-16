import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { apiFetch } from '../lib/api.ts';
import type { UserProfile } from '../types/music.ts';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  token: string | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: {
    username?: string;
    bio?: string;
    commercialUseMode?: boolean;
  }) => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const idToken = await user.getIdToken();
          setToken(idToken);
          const data = await apiFetch<{ user: UserProfile }>('/api/auth/me', {
            token: idToken,
          });
          setProfile(data.user);
        } catch {
          setProfile({
            uid: user.uid,
            username: user.displayName || 'Listener',
            email: user.email || '',
            profileImage: user.photoURL,
            bio: '',
            commercialUseMode: false,
          });
        }
      } else {
        setToken(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await cred.user.getIdToken();
      setToken(idToken);
      const data = await apiFetch<{ user: UserProfile }>('/api/auth/me', {
        token: idToken,
      });
      setProfile(data.user);
    } catch (err: any) {
      const code = typeof err?.code === 'string' ? err.code : '';
      if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
        setAuthError(
          'Sign-in popup was blocked by the browser or preview frame. Allow popups or open the app in a new tab.'
        );
      } else if (code === 'auth/unauthorized-domain') {
        setAuthError(
          'This domain is not yet authorized in Firebase Auth. Your library continues to save locally offline.'
        );
      } else {
        setAuthError(
          err instanceof Error
            ? err.message
            : 'Google sign-in was cancelled or failed.'
        );
      }
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setToken(null);
    setProfile(null);
  };

  const updateProfile = async (updates: {
    username?: string;
    bio?: string;
    commercialUseMode?: boolean;
  }) => {
    if (!token) return;
    const data = await apiFetch<{ user: UserProfile }>('/api/auth/me', {
      method: 'PATCH',
      token,
      body: JSON.stringify(updates),
    });
    setProfile(data.user);
  };

  const refreshToken = async () => {
    if (!firebaseUser) return null;
    const idToken = await firebaseUser.getIdToken(true);
    setToken(idToken);
    return idToken;
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        token,
        loading,
        authError,
        signInWithGoogle,
        signOut,
        updateProfile,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
