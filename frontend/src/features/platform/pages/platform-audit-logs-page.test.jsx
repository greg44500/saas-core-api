import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

const useListPlatformAuditLogsQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/platform/api/platform-audit-logs-api', () => ({
  useListPlatformAuditLogsQuery: useListPlatformAuditLogsQueryMock,
}));

import { PlatformAuditLogsPage } from '@/features/platform/pages/platform-audit-logs-page';

function renderPage(initialEntry = '/platform/audit-logs') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <PlatformAuditLogsPage />
    </MemoryRouter>,
  );
}

describe('PlatformAuditLogsPage', () => {
  beforeEach(() => {
    useListPlatformAuditLogsQueryMock.mockReset();
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
              name: 'Workspace Démo',
            },
            action: 'SUBSCRIPTION_UPDATED',
            status: 'success',
            entity: {
              type: 'Subscription',
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
      refetch: vi.fn(),
    });
  });

  it('affiche l’audit global avec le workspace dans le tableau partagé', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Audit logs' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Workspace' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Workspace Démo' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Abonnement modifié' })).toBeInTheDocument();
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
  });

  it('transmet pagination et filtres URL au endpoint Platform', () => {
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
      { refetchOnMountOrArgChange: true },
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
