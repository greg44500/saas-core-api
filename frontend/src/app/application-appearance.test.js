import { describe, expect, it } from 'vitest';

import {
  composeApplicationPalettes,
} from '@/app/application-appearance';

describe('application appearance registry', () => {
  it('compose les palettes dérivées avec la palette Core et leurs aperçus contrôlés', () => {
    expect(composeApplicationPalettes([
      {
        palettes: [
          {
            id: 'brand-blue',
            label: 'Marque bleue',
            previewColors: ['#0F172A', '#1D4ED8', '#60A5FA'],
          },
        ],
      },
    ])).toEqual([
      {
        id: 'core',
        label: 'Core Atlantique',
        previewColors: [
          '#137C8B',
          '#709CA7',
          '#B8CBD0',
          '#7A90A4',
          '#344D59',
        ],
      },
      {
        id: 'brand-blue',
        label: 'Marque bleue',
        previewColors: ['#0F172A', '#1D4ED8', '#60A5FA'],
      },
    ]);
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
