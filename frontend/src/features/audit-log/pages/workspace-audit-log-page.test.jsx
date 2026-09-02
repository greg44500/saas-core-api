import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

const useListWorkspaceAuditLogsQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/audit-log/api/audit-log-api', () => ({
  useListWorkspaceAuditLogsQuery: useListWorkspaceAuditLogsQueryMock,
}));

import { WorkspaceAuditLogPage } from '@/features/audit-log/pages/workspace-audit-log-page';
import { WorkspaceProvider } from '@/features/workspace/components/workspace-context';

const workspace = { id: 'workspace-1', name: 'Acme', status: 'active' };
const membership = { id: 'membership-1', role: { key: 'admin', name: 'Administrateur' } };

function renderPage(initialEntry = '/workspaces/workspace-1/activity') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <WorkspaceProvider
        membership={membership}
        permissions={['workspace:read', 'audit:read']}
        workspace={workspace}
      >
        <WorkspaceAuditLogPage />
      </WorkspaceProvider>
    </MemoryRouter>,
  );
}

describe('WorkspaceAuditLogPage', () => {
  beforeEach(() => {
    useListWorkspaceAuditLogsQueryMock.mockReset();
    useListWorkspaceAuditLogsQueryMock.mockReturnValue({
      data: {
        auditLogs: [
          {
            id: 'audit-1',
            actor: {
              id: 'user-1',
              firstName: 'Jean',
              lastName: 'Dupont',
              email: 'jean@example.com',
            },
            action: 'WORKSPACE_UPDATED',
            status: 'success',
            entity: { type: 'Workspace', id: 'workspace-1' },
            createdAt: '2026-09-02T10:00:00.000Z',
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

  afterEach(() => {
    cleanup();
  });

  it('affiche les données d’audit avec des libellés humains', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Historique d’activité' })).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Workspace modifié')).toBeInTheDocument();
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
    expect(screen.getByText('Réussie')).toBeInTheDocument();
  });

  it('transmet pagination et filtres URL au contrat RTK Query', () => {
    renderPage(
      '/workspaces/workspace-1/activity?page=2&action=FILE_DELETED&status=failed&entityType=File&from=2026-09-01&to=2026-09-02',
    );

    expect(useListWorkspaceAuditLogsQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'workspace-1',
        page: 2,
        limit: 20,
        action: 'FILE_DELETED',
        status: 'failed',
        entityType: 'File',
      }),
      { refetchOnMountOrArgChange: true },
    );

    const query = useListWorkspaceAuditLogsQueryMock.mock.calls[0][0];
    expect(Date.parse(query.from)).not.toBeNaN();
    expect(Date.parse(query.to)).not.toBeNaN();
    expect(Date.parse(query.from)).toBeLessThan(Date.parse(query.to));
  });

  it('affiche un état vide sans inventer d’événement', () => {
    useListWorkspaceAuditLogsQueryMock.mockReturnValue({
      data: {
        auditLogs: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      },
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByText('Aucun événement trouvé')).toBeInTheDocument();
  });
});
