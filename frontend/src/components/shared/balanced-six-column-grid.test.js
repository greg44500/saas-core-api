import { describe, expect, it } from 'vitest';

import {
  getBalancedSixColumnGridClass,
  getBalancedSixColumnItemClass,
} from '@/components/shared/balanced-six-column-grid';

describe('balanced six column grid', () => {
  it('utilise une grille commune de six colonnes', () => {
    expect(getBalancedSixColumnGridClass()).toBe('grid grid-cols-6 gap-4');
  });

  it('équilibre cinq éléments en trois puis deux sur grand écran', () => {
    const classes = Array.from({ length: 5 }, (_, index) => (
      getBalancedSixColumnItemClass(index, 5)
    ));

    expect(classes.slice(0, 3).every((value) => value.includes('xl:col-span-2'))).toBe(true);
    expect(classes.slice(3).every((value) => value.includes('xl:col-span-3'))).toBe(true);
  });

  it('équilibre quatre éléments en deux puis deux', () => {
    const classes = Array.from({ length: 4 }, (_, index) => (
      getBalancedSixColumnItemClass(index, 4)
    ));

    expect(classes.every((value) => value.includes('xl:col-span-3'))).toBe(true);
  });

  it('équilibre sept éléments en trois puis deux puis deux', () => {
    const classes = Array.from({ length: 7 }, (_, index) => (
      getBalancedSixColumnItemClass(index, 7)
    ));

    expect(classes.slice(0, 3).every((value) => value.includes('xl:col-span-2'))).toBe(true);
    expect(classes.slice(3).every((value) => value.includes('xl:col-span-3'))).toBe(true);
  });
});
