import { describe, expect, it } from 'vitest';

import {
  CORE_APPEARANCE_PALETTES,
  composeApplicationPalettes,
} from '@/app/application-appearance';

describe('application appearance registry', () => {
  it('déclare les quatre palettes Core avec cinq couleurs de prévisualisation', () => {
    expect(CORE_APPEARANCE_PALETTES.map((palette) => palette.id)).toEqual([
      'core',
      'refreshing-summer-fun',
      'leafy-green-garden',
      'golden-peachy-glow',
    ]);

    CORE_APPEARANCE_PALETTES.forEach((palette) => {
      expect(palette.previewColors).toHaveLength(5);
    });
  });

  it('compose les palettes dérivées après les palettes Core et leurs aperçus contrôlés', () => {
    const palettes = composeApplicationPalettes([
      {
        palettes: [
          {
            id: 'brand-blue',
            label: 'Marque bleue',
            previewColors: ['#0F172A', '#1D4ED8', '#60A5FA'],
          },
        ],
      },
    ]);

    expect(palettes).toHaveLength(5);
    expect(palettes.slice(0, 4)).toEqual(CORE_APPEARANCE_PALETTES);
    expect(palettes[4]).toEqual({
      id: 'brand-blue',
      label: 'Marque bleue',
      previewColors: ['#0F172A', '#1D4ED8', '#60A5FA'],
    });
  });

  it('refuse un identifiant libre, un aperçu invalide ou un doublon', () => {
    expect(() => composeApplicationPalettes([
      {
        palettes: [{
          id: '#ff0000',
          label: 'Libre',
          previewColors: ['#000000', '#111111', '#222222'],
        }],
      },
    ])).toThrow('Invalid appearance palette descriptor');

    expect(() => composeApplicationPalettes([
      {
        palettes: [{
          id: 'brand-blue',
          label: 'Sans aperçu valide',
          previewColors: ['red', 'blue', 'green'],
        }],
      },
    ])).toThrow('Invalid appearance palette descriptor');

    expect(() => composeApplicationPalettes([
      {
        palettes: [{
          id: 'core',
          label: 'Doublon',
          previewColors: ['#000000', '#111111', '#222222'],
        }],
      },
    ])).toThrow('Duplicate appearance palette id: core');
  });
});
