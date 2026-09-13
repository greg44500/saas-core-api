import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useDataPagination } from '@/hooks/use-data-pagination';

describe('useDataPagination', () => {
  it('initialise une pagination locale avec le contrat partagé', () => {
    const { result } = renderHook(() => useDataPagination());

    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(10);
  });

  it('revient à la première page lorsqu’une nouvelle taille est choisie', () => {
    const { result } = renderHook(() => useDataPagination());

    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);

    act(() => result.current.setPageSize(20));

    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(20);
  });

  it('accepte une taille initiale contextualisée sans déplacer cet état dans Redux', () => {
    const { result } = renderHook(() => useDataPagination({ initialPageSize: 50 }));

    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(50);
  });
});
