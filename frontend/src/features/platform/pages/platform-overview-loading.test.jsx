import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

const mocks = vi.hoisted(() => ({
  useGetPlatformAuditMetadataQuery: vi.fn(),
  useGetPlatformOverviewQuery: vi.fn(),
}));

vi.mock('@/features/platform/api/platform-audit-logs-api', () => ({
  useGetPlatformAuditMetadataQuery: mocks.useGetPlatformAuditMetadataQuery,
}));

vi.mock('@/features/platform/api/platform-overview-api', () => ({
  useGetPlatformOverviewQuery: mocks.useGetPlatformOverviewQuery,
}));

import { PlatformOverviewPage } from '@/features/platform/pages/platform-overview-page';

describe('PlatformOverviewPage loading', () => {
  it('affiche le skeleton quand la requête fetch sans encore disposer de données', () => {
    mocks.useGetPlatformOverviewQuery.mockReturnValue({
      data: undefined,
      isError: false,
      isFetching: true,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.useGetPlatformAuditMetadataQuery.mockReturnValue({
      data: undefined,
      isError: false,
      isFetching: false,
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/platform/overview']}>
        <PlatformOverviewPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Chargement de la vue d’ensemble…',
    );
    expect(
      screen.queryByRole('heading', { name: 'Vue d’ensemble' }),
    ).not.toBeInTheDocument();
  });
});
