import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

const mocks = vi.hoisted(() => ({
  useGetWorkspaceFileStorageQuery: vi.fn(),
  useListWorkspaceFilesQuery: vi.fn(),
  useListWorkspaceFileTrashQuery: vi.fn(),
}));

vi.mock('@/features/files/api/files-api', () => ({
  useGetWorkspaceFileStorageQuery: mocks.useGetWorkspaceFileStorageQuery,
  useListWorkspaceFilesQuery: mocks.useListWorkspaceFilesQuery,
  useListWorkspaceFileTrashQuery: mocks.useListWorkspaceFileTrashQuery,
}));

vi.mock('@/features/files/pages/workspace-files-page', () => ({
  WorkspaceFilesPage: ({ embedded }) => (
    <div>Active files panel {embedded ? 'embedded' : 'standalone'}</div>
  ),
}));

vi.mock('@/features/files/pages/workspace-file-trash-page', () => ({
  WorkspaceFileTrashPage: ({ embedded }) => (
    <div>Trash panel {embedded ? 'embedded' : 'standalone'}</div>
  ),
}));

import { WorkspaceFileManagementPage } from '@/features/files/pages/workspace-file-management-page';
import { WorkspaceProvider } from '@/features/workspace/components/workspace-context';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';

const workspace = { id: 'workspace-1', name: 'Acme', status: 'active' };
const membership = { id: 'membership-1', role: { key: 'member', name: 'Membre' } };

function renderPage(permissions, initialEntry = '/workspaces/workspace-1/files') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <WorkspaceProvider
        membership={membership}
        permissions={permissions}
        workspace={workspace}
      >
        <WorkspaceFileManagementPage />
      </WorkspaceProvider>
    </MemoryRouter>,
  );
}

describe('WorkspaceFileManagementPage', () => {
  beforeEach(() => {
    mocks.useGetWorkspaceFileStorageQuery.mockReset();
    mocks.useListWorkspaceFilesQuery.mockReset();
    mocks.useListWorkspaceFileTrashQuery.mockReset();

    mocks.useGetWorkspaceFileStorageQuery.mockReturnValue({
      data: {
        usedBytes: 68 * 1024 * 1024,
        limitBytes: 100 * 1024 * 1024,
        remainingBytes: 32 * 1024 * 1024,
        unlimited: false,
        overLimit: false,
      },
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.useListWorkspaceFilesQuery.mockReturnValue({
      data: {
        files: [],
        pagination: { page: 1, limit: 1, total: 14, totalPages: 14 },
      },
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.useListWorkspaceFileTrashQuery.mockReturnValue({
      data: {
        files: [],
        pagination: { page: 1, limit: 1, total: 3, totalPages: 3 },
      },
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('présente stockage, compteurs et fichiers actifs dans une seule surface', () => {
    renderPage([
      WORKSPACE_PERMISSION.FILE_READ,
      WORKSPACE_PERMISSION.FILE_TRASH_READ,
    ]);

    expect(screen.getByRole('heading', { name: 'Fichiers' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'À propos des fichiers' })).toBeInTheDocument();
    expect(screen.queryByText('Gérez les fichiers et la capacité de stockage de Acme.'))
      .not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Stockage' })).toBeInTheDocument();
    expect(screen.getByText('14 fichiers actifs')).toBeInTheDocument();
    expect(screen.getByText('3 fichiers dans la corbeille')).toBeInTheDocument();
    expect(screen.getByText('Active files panel embedded')).toBeInTheDocument();
    expect(screen.queryByText('Trash panel embedded')).not.toBeInTheDocument();
  });

  it('bascule vers la corbeille sans créer une seconde entrée de navigation', async () => {
    const user = userEvent.setup();

    renderPage([
      WORKSPACE_PERMISSION.FILE_READ,
      WORKSPACE_PERMISSION.FILE_TRASH_READ,
    ]);

    await user.click(screen.getByRole('tab', { name: /Corbeille/ }));

    expect(screen.getByText('Trash panel embedded')).toBeInTheDocument();
    expect(screen.queryByText('Active files panel embedded')).not.toBeInTheDocument();
  });

  it('ne révèle ni onglet ni compteur de corbeille sans file:trash:read', () => {
    renderPage([WORKSPACE_PERMISSION.FILE_READ]);

    expect(screen.queryByRole('tab', { name: /Corbeille/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/dans la corbeille/)).not.toBeInTheDocument();
    expect(mocks.useListWorkspaceFileTrashQuery).toHaveBeenCalledWith(
      {
        workspaceId: 'workspace-1',
        page: 1,
        limit: 1,
      },
      { skip: true },
    );
  });

  it('ouvre directement la corbeille depuis le paramètre de compatibilité', () => {
    renderPage(
      [
        WORKSPACE_PERMISSION.FILE_READ,
        WORKSPACE_PERMISSION.FILE_TRASH_READ,
      ],
      '/workspaces/workspace-1/files?tab=trash',
    );

    expect(screen.getByText('Trash panel embedded')).toBeInTheDocument();
    expect(screen.queryByText('Active files panel embedded')).not.toBeInTheDocument();
  });
});
