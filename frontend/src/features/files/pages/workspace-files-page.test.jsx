import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  deleteWorkspaceFile: vi.fn(),
  downloadBlob: vi.fn(),
  downloadWorkspaceFile: vi.fn(),
  uploadWorkspaceFile: vi.fn(),
  useDeleteWorkspaceFileMutation: vi.fn(),
  useDownloadWorkspaceFileMutation: vi.fn(),
  useListWorkspaceFilesQuery: vi.fn(),
  useUploadWorkspaceFileMutation: vi.fn(),
}));

vi.mock('@/features/files/api/files-api', () => ({
  useDeleteWorkspaceFileMutation: mocks.useDeleteWorkspaceFileMutation,
  useDownloadWorkspaceFileMutation: mocks.useDownloadWorkspaceFileMutation,
  useListWorkspaceFilesQuery: mocks.useListWorkspaceFilesQuery,
  useUploadWorkspaceFileMutation: mocks.useUploadWorkspaceFileMutation,
}));

vi.mock('@/features/files/lib/download-blob', () => ({
  downloadBlob: mocks.downloadBlob,
}));

import { WorkspaceFilesPage } from '@/features/files/pages/workspace-files-page';
import { WorkspaceProvider } from '@/features/workspace/components/workspace-context';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';

const workspace = { id: 'workspace-1', name: 'Acme', status: 'active' };
const membership = { id: 'membership-1', role: { key: 'member', name: 'Membre' } };
const file = {
  id: 'file-1',
  originalName: 'contrat.pdf',
  mimeType: 'application/pdf',
  extension: 'pdf',
  sizeBytes: 2048,
  category: 'document',
  status: 'active',
  uploadedBy: 'user-1',
  createdAt: '2026-09-02T10:00:00.000Z',
  updatedAt: '2026-09-02T10:00:00.000Z',
};

function renderPage(permissions = [WORKSPACE_PERMISSION.FILE_READ]) {
  return render(
    <WorkspaceProvider
      membership={membership}
      permissions={permissions}
      workspace={workspace}
    >
      <WorkspaceFilesPage />
    </WorkspaceProvider>,
  );
}

describe('WorkspaceFilesPage', () => {
  beforeEach(() => {
    mocks.deleteWorkspaceFile.mockReset();
    mocks.downloadWorkspaceFile.mockReset();
    mocks.downloadBlob.mockReset();
    mocks.uploadWorkspaceFile.mockReset();
    mocks.useDeleteWorkspaceFileMutation.mockReset();
    mocks.useListWorkspaceFilesQuery.mockReset();
    mocks.useDownloadWorkspaceFileMutation.mockReset();
    mocks.useUploadWorkspaceFileMutation.mockReset();

    mocks.useListWorkspaceFilesQuery.mockReturnValue({
      data: {
        files: [file],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.useDownloadWorkspaceFileMutation.mockReturnValue([
      mocks.downloadWorkspaceFile,
      { isLoading: false },
    ]);
    mocks.useUploadWorkspaceFileMutation.mockReturnValue([
      mocks.uploadWorkspaceFile,
      { isLoading: false },
    ]);
    mocks.useDeleteWorkspaceFileMutation.mockReturnValue([
      mocks.deleteWorkspaceFile,
      { isLoading: false },
    ]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('affiche le listing paginé du workspace', () => {
    renderPage();

    expect(mocks.useListWorkspaceFilesQuery).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      page: 1,
      limit: 20,
    });
    expect(screen.getByRole('heading', { name: 'Fichiers' })).toBeInTheDocument();
    expect(screen.getByText('contrat.pdf')).toBeInTheDocument();
    expect(screen.getByText('Document')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('2 Ko')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Télécharger contrat.pdf' }),
    ).toBeInTheDocument();
  });

  it('affiche l’action d’upload uniquement avec file:upload', () => {
    const { unmount } = renderPage([WORKSPACE_PERMISSION.FILE_READ]);

    expect(screen.queryByRole('button', { name: 'Ajouter un fichier' })).not.toBeInTheDocument();

    unmount();
    renderPage([
      WORKSPACE_PERMISSION.FILE_READ,
      WORKSPACE_PERMISSION.FILE_UPLOAD,
    ]);

    expect(screen.getByRole('button', { name: 'Ajouter un fichier' })).toBeInTheDocument();
  });

  it('affiche l’action de suppression uniquement avec file:delete', () => {
    const { unmount } = renderPage([WORKSPACE_PERMISSION.FILE_READ]);

    expect(screen.queryByRole('button', { name: 'Retirer contrat.pdf' })).not.toBeInTheDocument();

    unmount();
    renderPage([
      WORKSPACE_PERMISSION.FILE_READ,
      WORKSPACE_PERMISSION.FILE_DELETE,
    ]);

    expect(screen.getByRole('button', { name: 'Retirer contrat.pdf' })).toBeInTheDocument();
  });

  it('confirme le soft-delete puis transmet workspaceId et fileId', async () => {
    const user = userEvent.setup();
    const unwrap = vi.fn().mockResolvedValue('');

    mocks.deleteWorkspaceFile.mockReturnValue({ unwrap });

    renderPage([
      WORKSPACE_PERMISSION.FILE_READ,
      WORKSPACE_PERMISSION.FILE_DELETE,
    ]);

    await user.click(screen.getByRole('button', { name: 'Retirer contrat.pdf' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/au maximum 30 jours/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retirer le fichier' }));

    expect(mocks.deleteWorkspaceFile).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      fileId: 'file-1',
    });
    expect(
      await screen.findByText(/contrat.pdf a été retiré des fichiers actifs/i),
    ).toBeInTheDocument();
  });

  it('conserve le dialogue ouvert et affiche le refus backend', async () => {
    const user = userEvent.setup();
    const unwrap = vi.fn().mockRejectedValue({
      status: 403,
      data: { message: 'Vous ne pouvez pas supprimer ce fichier.' },
    });

    mocks.deleteWorkspaceFile.mockReturnValue({ unwrap });

    renderPage([
      WORKSPACE_PERMISSION.FILE_READ,
      WORKSPACE_PERMISSION.FILE_DELETE,
    ]);

    await user.click(screen.getByRole('button', { name: 'Retirer contrat.pdf' }));
    await user.click(screen.getByRole('button', { name: 'Retirer le fichier' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Vous ne pouvez pas supprimer ce fichier.',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('change de page via la pagination serveur', async () => {
    const user = userEvent.setup();

    mocks.useListWorkspaceFilesQuery.mockReturnValue({
      data: {
        files: [file],
        pagination: { page: 1, limit: 20, total: 25, totalPages: 2 },
      },
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();
    await user.click(screen.getByRole('button', { name: 'Suivant' }));

    expect(mocks.useListWorkspaceFilesQuery).toHaveBeenLastCalledWith({
      workspaceId: 'workspace-1',
      page: 2,
      limit: 20,
    });
  });

  it('télécharge via RTK Query puis délègue le Blob au navigateur', async () => {
    const user = userEvent.setup();
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    const unwrap = vi.fn().mockResolvedValue(blob);

    mocks.downloadWorkspaceFile.mockReturnValue({ unwrap });

    renderPage();
    await user.click(screen.getByRole('button', { name: 'Télécharger contrat.pdf' }));

    expect(mocks.downloadWorkspaceFile).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      fileId: 'file-1',
    });
    expect(mocks.downloadBlob).toHaveBeenCalledWith(blob, 'contrat.pdf');
  });

  it('affiche un état vide explicite', () => {
    mocks.useListWorkspaceFilesQuery.mockReturnValue({
      data: {
        files: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      },
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByText('Aucun fichier actif')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('permet de relancer la requête après une erreur', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();

    mocks.useListWorkspaceFilesQuery.mockReturnValue({
      data: undefined,
      error: { status: 500 },
      isLoading: false,
      refetch,
    });

    renderPage();
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(screen.getByText('Impossible de charger les fichiers du workspace.')).toBeInTheDocument();
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
