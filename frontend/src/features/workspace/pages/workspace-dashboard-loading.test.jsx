import { describe, expect, it } from 'vitest';

import { isInitialQueryLoading } from '@/features/workspace/components/core-dashboard-widgets';

describe('isInitialQueryLoading', () => {
  it('considère un fetch sans donnée comme un premier chargement', () => {
    expect(isInitialQueryLoading({
      data: undefined,
      isFetching: true,
      isLoading: false,
    })).toBe(true);
  });

  it('conserve les données déjà disponibles pendant un refetch', () => {
    expect(isInitialQueryLoading({
      data: { value: 1 },
      isFetching: true,
      isLoading: false,
    })).toBe(false);
  });

  it('considère isLoading comme un premier chargement', () => {
    expect(isInitialQueryLoading({
      data: undefined,
      isFetching: false,
      isLoading: true,
    })).toBe(true);
  });
});
