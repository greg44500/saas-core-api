import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

const useGetPlatformAuditMetadataQueryMock = vi.hoisted(() => vi.fn());
const useListPlatformAuditLogsQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/platform/api/platform-audit-logs-api', () => ({
  useGetPlatformAuditMetadataQuery: useGetPlatformAuditMetadataQueryMock,
  useListPlatformAuditLogsQuery: useListPlatformAuditLogsQueryMock,
}));

import { PlatformAuditLogsPage } from '@/features/platform/pages/platform-audit-logs-page';

const auditMetadata = {
  actions: [
    { value: 'ENTITLEMENT_OVERRIDE_REVOKED', label: 'Dérogation révoquée' },
    { value: 'FILE_DELETED', label: 'Fichier supprimé' },
  ],
  entityTypes: [
    { value: 'EntitlementOverride', label: 'Dérogation' },
    { value: 'File', label: 'Fichier' },
  ],
  statuses: [
    { value: 'success', label: 'Réussie' },
    { value: 'failed', label: 'Échouée' },
  ],
};

function renderPage(initialEntry = '/platform/audit-logs') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <PlatformAuditLogsPage />
    </MemoryRouter>,
  );
}

describe('PlatformAuditLogsPage', () => {
  beforeEach(() => {
    useGetPlatformAuditMetadataQueryMock.mockReset();
    useListPlatformAuditLogsQueryMock.mockReset();
    useGetPlatformAuditMetadataQueryMock.mockReturnValue({
      data: auditMetadata,
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    useListPlatformAuditLogsQueryMock.mockReturnValue({
      data: {
        auditLogs: [
          {
            id: 'audit-1',
            actor: {
              id: '507f1f77bcf86cd799439011',
              firstName: 'Jean',
              lastName: 'Dupont',
              email: 'jean@example.com',
            },
            workspace: {
              id: '507f1f77bcf86cd799439012',
              name: 'Espace Démo',
            },
            action: 'ENTITLEMENT_OVERRIDE_REVOKED',
            status: 'success',
            entity: {
              type: 'EntitlementOverride',
              id: '507f1f77bcf86cd799439013',
            },
            createdAt: '2026-09-03T05:00:00.000Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      },
      isError: false,
      isFetching: false,
      isLoading: false,
      isUninitialized: false,
      refetch: vi.fn(),
    });
  });

  it('affiche les libellés métier fournis par le backend', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Journaux d’audit' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Espace de travail' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Espace Démo' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Dérogation révoquée' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Dérogation' })).toBeInTheDocument();
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
  });

  it('propose automatiquement Dérogation dans le filtre Ressource', () => {
    renderPage();

    expect(screen.getByRole('option', { name: 'Dérogation' })).toHaveValue(
      'EntitlementOverride',
    );
  });

  it('transmet pagination et filtres URL validés par metadata au endpoint Platform', () => {
    renderPage(
      '/platform/audit-logs?page=3&action=FILE_DELETED&status=failed&entityType=File&from=2026-09-01&to=2026-09-03',
    );

    expect(useListPlatformAuditLogsQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 3,
        limit: 20,
        action: 'FILE_DELETED',
        status: 'failed',
        entityType: 'File',
      }),
      {
        skip: false,
        refetchOnMountOrArgChange: true,
      },
    );

    const query = useListPlatformAuditLogsQueryMock.mock.calls[0][0];
    expect(Date.parse(query.from)).not.toBeNaN();
    expect(Date.parse(query.to)).not.toBeNaN();
    expect(Date.parse(query.from)).toBeLessThan(Date.parse(query.to));
  });

  it('n’expose aucune valeur technique absente du DTO frontend', () => {
    renderPage();

    expect(screen.queryByText('192.0.2.10')).not.toBeInTheDocument();
    expect(screen.queryByText('Mozilla/5.0 test-agent')).not.toBeInTheDocument();
    expect(screen.queryByText('internal-secret-metadata')).not.toBeInTheDocument();
  });
});
