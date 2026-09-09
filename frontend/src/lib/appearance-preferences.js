import {
  ACTIVE_APPEARANCE_PALETTE_IDS,
} from '@/app/application-appearance';

const APPEARANCE_THEME = Object.freeze({
  SYSTEM: 'system',
  LIGHT: 'light',
  DARK: 'dark',
});

const APPEARANCE_FONT_FAMILY = Object.freeze({
  INTER: 'inter',
  GEIST: 'geist',
  MANROPE: 'manrope',
  SYSTEM: 'system',
});

const APPEARANCE_PALETTE = Object.freeze({
  CORE: 'core',
});

const APPEARANCE_ACCESSIBILITY_MODE = Object.freeze({
  STANDARD: 'standard',
  ENHANCED: 'enhanced',
});

const DEFAULT_COMFORT_PREFERENCES = Object.freeze({
  theme: APPEARANCE_THEME.SYSTEM,
  fontFamily: APPEARANCE_FONT_FAMILY.INTER,
  paletteId: APPEARANCE_PALETTE.CORE,
  accessibilityMode: APPEARANCE_ACCESSIBILITY_MODE.STANDARD,
});

const COMFORT_STORAGE_PREFIX = 'saas-core:comfort';
const LEGACY_THEME_STORAGE_PREFIX = 'saas-core:theme';

function isAllowedValue(value, registry) {
  return Object.values(registry).includes(value);
}

function normalizeComfortPreferences(preferences) {
  const source = preferences ?? {};

  return {
    theme: isAllowedValue(source.theme, APPEARANCE_THEME)
      ? source.theme
      : DEFAULT_COMFORT_PREFERENCES.theme,
    fontFamily: isAllowedValue(source.fontFamily, APPEARANCE_FONT_FAMILY)
      ? source.fontFamily
      : DEFAULT_COMFORT_PREFERENCES.fontFamily,
    paletteId: ACTIVE_APPEARANCE_PALETTE_IDS.includes(source.paletteId)
      ? source.paletteId
      : DEFAULT_COMFORT_PREFERENCES.paletteId,
    accessibilityMode: isAllowedValue(
      source.accessibilityMode,
      APPEARANCE_ACCESSIBILITY_MODE,
    )
      ? source.accessibilityMode
      : DEFAULT_COMFORT_PREFERENCES.accessibilityMode,
  };
}

function getComfortStorageKey(storageScope = 'anonymous') {
  return `${COMFORT_STORAGE_PREFIX}:${storageScope}`;
}

function readStoredComfortPreferences(storageScope = 'anonymous') {
  if (typeof window === 'undefined') return DEFAULT_COMFORT_PREFERENCES;

  try {
    const storedValue = window.localStorage.getItem(
      getComfortStorageKey(storageScope),
    );

    if (storedValue) {
      return normalizeComfortPreferences(JSON.parse(storedValue));
    }

    const legacyTheme = window.localStorage.getItem(
      `${LEGACY_THEME_STORAGE_PREFIX}:${storageScope}`,
    );

    if (legacyTheme === 'light' || legacyTheme === 'dark') {
      return normalizeComfortPreferences({ theme: legacyTheme });
    }
  } catch {
    return DEFAULT_COMFORT_PREFERENCES;
  }

  return DEFAULT_COMFORT_PREFERENCES;
}

function writeStoredComfortPreferences(
  preferences,
  storageScope = 'anonymous',
) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      getComfortStorageKey(storageScope),
      JSON.stringify(normalizeComfortPreferences(preferences)),
    );
  } catch {
    // Une préférence locale ne doit jamais empêcher l'application de démarrer.
  }
}

export {
  APPEARANCE_ACCESSIBILITY_MODE,
  APPEARANCE_FONT_FAMILY,
  APPEARANCE_PALETTE,
  APPEARANCE_THEME,
  COMFORT_STORAGE_PREFIX,
  DEFAULT_COMFORT_PREFERENCES,
  getComfortStorageKey,
  normalizeComfortPreferences,
  readStoredComfortPreferences,
  writeStoredComfortPreferences,
};
