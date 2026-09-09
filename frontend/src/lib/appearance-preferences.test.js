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

  it('conserve les polices déclarées par le contrat', () => {
    expect(normalizeComfortPreferences({ fontFamily: 'geist' }).fontFamily)
      .toBe('geist');
    expect(normalizeComfortPreferences({ fontFamily: 'manrope' }).fontFamily)
      .toBe('manrope');
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
