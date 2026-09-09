import { afterEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_COMFORT_PREFERENCES,
  normalizeComfortPreferences,
  readStoredComfortPreferences,
} from '@/lib/appearance-preferences';

describe('appearance preferences contract', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('retombe sur les valeurs contrôlées pour des valeurs arbitraires', () => {
    expect(normalizeComfortPreferences({
      theme: 'sepia',
      fontFamily: 'https://example.com/font.woff2',
      paletteId: '#ff0000',
      accessibilityMode: 'off',
    })).toEqual(DEFAULT_COMFORT_PREFERENCES);
  });

  it('reprend le thème local historique sans accepter d’autre donnée libre', () => {
    window.localStorage.setItem('saas-core:theme:anonymous', 'dark');

    expect(readStoredComfortPreferences('anonymous')).toEqual({
      ...DEFAULT_COMFORT_PREFERENCES,
      theme: 'dark',
    });
  });
});
