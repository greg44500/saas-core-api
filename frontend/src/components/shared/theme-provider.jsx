import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const THEME_STORAGE_PREFIX = 'saas-core:theme';
const ThemeContext = createContext(null);

function getSystemTheme() {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getStorageKey(storageScope) {
  return `${THEME_STORAGE_PREFIX}:${storageScope}`;
}

function readStoredTheme(storageKey) {
  if (typeof window === 'undefined') {
    return null;
  }

  const storedTheme = window.localStorage.getItem(storageKey);

  return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : null;
}

function ThemeProvider({ children, storageScope = 'anonymous' }) {
  const storageKey = getStorageKey(storageScope);
  const [theme, setTheme] = useState(
    () => readStoredTheme(storageKey) ?? getSystemTheme(),
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(storageKey, theme);
  }, [storageKey, theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme((currentTheme) =>
        currentTheme === 'dark' ? 'light' : 'dark',
      ),
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}

export { ThemeProvider, useTheme };
