import { describe, expect, it } from 'vitest';

import {
  composeApplicationPalettes,
} from '@/app/application-appearance';

describe('application appearance registry', () => {
  it('compose les palettes dérivées avec la palette Core', () => {
    expect(composeApplicationPalettes([
      {
        palettes: [
          { id: 'brand-blue', label: 'Marque bleue' },
        ],
      },
    ])).toEqual([
      { id: 'core', label: 'Core Atlantique' },
      { id: 'brand-blue', label: 'Marque bleue' },
    ]);
  });

  it('refuse un identifiant CSS libre ou un doublon', () => {
    expect(() => composeApplicationPalettes([
      { palettes: [{ id: '#ff0000', label: 'Libre' }] },
    ])).toThrow('Invalid appearance palette descriptor');

    expect(() => composeApplicationPalettes([
      { palettes: [{ id: 'core', label: 'Doublon' }] },
    ])).toThrow('Duplicate appearance palette id: core');
  });
});
