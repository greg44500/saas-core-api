import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/shared/toast-provider';
import { findToastByText } from '@/test/toast-assertions';

const mocks = vi.hoisted(() => ({
  restoreWorkspaceFile: vi.fn(),
  useListWorkspaceFileTrashQuery: vi.fn(),
  useRestoreWorkspaceFileMutation: vi.fn(),
}));

vi.mock('@/features/files/api/files-api', () => ({
  useListWorkspaceFileTrashQuery: mocks.useListWorkspaceFileTrashQuery,
  useRestoreWorkspaceFileMutation: mocks.useRestoreWorkspaceFileMutation,
}));

import { WorkspaceFileTrashPage } from '@/features/files/pages/workspace-file-trash-page';
import { WorkspaceProvider } from '@/features/workspace/components/workspace-context';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';

const workspace = { id: 'workspace-1', name: 'Acme', status: 'active' };
const membership = { id: 'membership-1', role: { key: 'admin', name: 'Administrateur' } };
const deletedFile = {
  id: 'file-1',
  originalName: 'contrat.pdf',
  mimeType: 'application/pdf',
  extension: 'pdf',
  sizeBytes: 2048,
  category: 'document',
  status: 'deleted',
  uploadedBy: 'user-1',
  deletedBy: 'user-2',
  deletedAt: '2026-09-01T10:00:00.000Z',
  purgeScheduledAt: '2026-10-01T10:00:00.000Z',
  createdAt: '2026-08-20T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
};

function renderPage(permissions = [WORKSPACE_PERMISSION.FILE_TRASH_READ]) {
  return render(
    <ToastProvider>
      <WorkspaceProvider
        features={[]}
        membership={membership}
        permissions={permissions}
        workspace={workspace}
      >
        <WorkspaceFileTrashPage />
      </WorkspaceProvider>
    </ToastProvider>,
  );
}

describe('WorkspaceFileTrashPage', () => {
  beforeEach(() => {
    mocks.restoreWorkspaceFile.mockReset();
    mocks.useListWorkspaceFileTrashQuery.mockReset();
    mocks.useRestoreWorkspaceFileMutation.mockReset();

    mocks.useListWorkspaceFileTrashQuery.mockReturnValue({
      data: {
        files: [deletedFile],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.useRestoreWorkspaceFileMutation.mockReturnValue([
      mocks.restoreWorkspaceFile,
      { isLoading: false },
    ]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('affiche la corbeille avec le DataTable partagé et les échéances de purge', () => {
    renderPage([
      WORKSPACE_PERMISSION.FILE_TRASH_READ,
      WORKSPACE_PERMISSION.FILE_RESTORE,
    ]);

    expect(mocks.useListWorkspaceFileTrashQuery).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      page: 1,
      limit: 10,
    });
    expect(screen.getByRole('heading', { name: 'Corbeille' })).toBeInTheDocument();

    const table = screen.getByRole('table', {
      name: 'Corbeille des fichiers du workspace',
    });
    expect(within(table).getByText('contrat.pdf')).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Supprimé le' }))
      .toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Purge prévue' }))
      .toBeInTheDocument();
    expect(
      within(table).getByRole('button', { name: 'Restaurer contrat.pdf' }),
    ).toBeInTheDocument();
  });

  it('masque la restauration sans permission file:restore', () => {
    renderPage([WORKSPACE_PERMISSION.FILE_TRASH_READ]);

    expect(
      screen.queryByRole('button', { name: 'Restaurer contrat.pdf' }),
    ).not.toBeInTheDocument();
  });

  it('restaure le fichier puis affiche le succès en toast', async () => {
    const user = userEvent.setup();
    const unwrap = vi.fn().mockResolvedValue({
      ...deletedFile,
      status: 'active',
    });
    mocks.restoreWorkspaceFile.mockReturnValue({ unwrap });

    renderPage([
      WORKSPACE_PERMISSION.FILE_TRASH_READ,
      WORKSPACE_PERMISSION.FILE_RESTORE,
    ]);

    await user.click(
      screen.getByRole('button', { name: 'Restaurer contrat.pdf' }),
    );

    expect(mocks.restoreWorkspaceFile).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      fileId: 'file-1',
    });
    const toast = await findToastByText('Fichier restauré');
    expect(toast).toHaveTextContent('contrat.pdf');
  });

  it('affiche un état vide explicite', () => {
    mocks.useListWorkspaceFileTrashQuery.mockReturnValue({
      data: {
        files: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      },
      error: undefined,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByText('La corbeille est vide')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('conserve le shell et affiche le skeleton pendant le chargement initial', () => {
    mocks.useListWorkspaceFileTrashQuery.mockReturnValue({
      data: undefined,
      error: undefined,
      isFetching: true,
      isLoading: true,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByRole('heading', { name: 'Corbeille' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Chargement du tableau…');
  });

  it('affiche le refus backend de restauration dans un toast', async () => {
    const user = userEvent.setup();
    const unwrap = vi.fn().mockRejectedValue({
      status: 409,
      data: { message: 'La purge du fichier a commencé.' },
    });
    mocks.restoreWorkspaceFile.mockReturnValue({ unwrap });

    renderPage([
      WORKSPACE_PERMISSION.FILE_TRASH_READ,
      WORKSPACE_PERMISSION.FILE_RESTORE,
    ]);

    await user.click(
      screen.getByRole('button', { name: 'Restaurer contrat.pdf' }),
    );

    const toast = await findToastByText('Restauration impossible');
    expect(toast).toHaveTextContent('La purge du fichier a commencé.');
  });
});
