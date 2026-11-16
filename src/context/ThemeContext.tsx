import React, { createContext, useContext, useEffect, useState } from 'react';
import { offlineDb } from '../lib/offlineDb.ts';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setThemeState] = useState<ThemeMode>('light'); // Default to Apple Music style Light Mode

  useEffect(() => {
    (async () => {
      try {
        const pref = await offlineDb.preferences.get('themeMode');
        if (pref?.value === 'dark' || pref?.value === 'light') {
          setThemeState(pref.value as ThemeMode);
        } else {
          setThemeState('light');
        }
      } catch {
        setThemeState('light');
      }
    })();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const setTheme = async (mode: ThemeMode) => {
    setThemeState(mode);
    try {
      await offlineDb.preferences.put({ key: 'themeMode', value: mode });
    } catch {}
  };

  const toggleTheme = () => {
    void setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
