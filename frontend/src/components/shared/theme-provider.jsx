import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  APPEARANCE_ACCESSIBILITY_MODE,
  APPEARANCE_THEME,
  normalizeComfortPreferences,
  readStoredComfortPreferences,
  writeStoredComfortPreferences,
} from '@/lib/appearance-preferences';

const ThemeContext = createContext(null);

function getSystemTheme() {
  if (typeof window === 'undefined') return APPEARANCE_THEME.LIGHT;

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? APPEARANCE_THEME.DARK
    : APPEARANCE_THEME.LIGHT;
}

function ThemeProvider({ children, storageScope = 'anonymous' }) {
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const [comfortPreferences, setComfortPreferences] = useState(
    () => readStoredComfortPreferences(storageScope),
  );

  const resolvedTheme = comfortPreferences.theme === APPEARANCE_THEME.SYSTEM
    ? systemTheme
    : comfortPreferences.theme;

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mediaQuery) return undefined;

    const handleSystemThemeChange = (event) => {
      setSystemTheme(
        event.matches ? APPEARANCE_THEME.DARK : APPEARANCE_THEME.LIGHT,
      );
    };

    mediaQuery.addEventListener?.('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener?.('change', handleSystemThemeChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    root.classList.toggle('dark', resolvedTheme === APPEARANCE_THEME.DARK);
    root.classList.toggle(
      'a11y-enhanced',
      comfortPreferences.accessibilityMode
        === APPEARANCE_ACCESSIBILITY_MODE.ENHANCED,
    );
    root.dataset.fontFamily = comfortPreferences.fontFamily;
    root.dataset.palette = comfortPreferences.paletteId;
    root.style.colorScheme = resolvedTheme;
  }, [comfortPreferences, resolvedTheme]);

  const applyComfortPreferences = useCallback((preferences, options = {}) => {
    const { persistLocal = false } = options;
    const normalizedPreferences = normalizeComfortPreferences(preferences);

    setComfortPreferences(normalizedPreferences);

    if (persistLocal) {
      writeStoredComfortPreferences(normalizedPreferences, storageScope);
    }
  }, [storageScope]);

  const restoreLocalPreferences = useCallback(() => {
    setComfortPreferences(readStoredComfortPreferences(storageScope));
  }, [storageScope]);

  const setTheme = useCallback((theme, options = {}) => {
    const nextPreferences = {
      ...comfortPreferences,
      theme,
    };

    applyComfortPreferences(nextPreferences, {
      persistLocal: options.persistLocal ?? true,
    });
  }, [applyComfortPreferences, comfortPreferences]);

  const toggleTheme = useCallback((options = {}) => {
    const nextTheme = resolvedTheme === APPEARANCE_THEME.DARK
      ? APPEARANCE_THEME.LIGHT
      : APPEARANCE_THEME.DARK;

    setTheme(nextTheme, options);
  }, [resolvedTheme, setTheme]);

  const value = useMemo(
    () => ({
      applyComfortPreferences,
      comfortPreferences,
      resolvedTheme,
      restoreLocalPreferences,
      setTheme,
      theme: comfortPreferences.theme,
      toggleTheme,
    }),
    [
      applyComfortPreferences,
      comfortPreferences,
      resolvedTheme,
      restoreLocalPreferences,
      setTheme,
      toggleTheme,
    ],
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

export { ThemeProvider, getSystemTheme, useTheme };
