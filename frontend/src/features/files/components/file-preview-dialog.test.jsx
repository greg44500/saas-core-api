import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createObjectURL: vi.fn(),
  loadWorkspaceFilePreview: vi.fn(),
  revokeObjectURL: vi.fn(),
  useDownloadWorkspaceFileMutation: vi.fn(),
}));

vi.mock('@/features/files/api/files-api', () => ({
  useDownloadWorkspaceFileMutation: mocks.useDownloadWorkspaceFileMutation,
}));

import { FilePreviewDialog } from '@/features/files/components/file-preview-dialog';

const pdfFile = {
  id: 'file-1',
  originalName: 'contrat.pdf',
  mimeType: 'application/pdf',
};

describe('FilePreviewDialog', () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    mocks.createObjectURL.mockReset();
    mocks.loadWorkspaceFilePreview.mockReset();
    mocks.revokeObjectURL.mockReset();
    mocks.useDownloadWorkspaceFileMutation.mockReset();

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: mocks.createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: mocks.revokeObjectURL,
    });

    mocks.useDownloadWorkspaceFileMutation.mockReturnValue([
      mocks.loadWorkspaceFilePreview,
      { isLoading: false },
    ]);
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: originalCreateObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: originalRevokeObjectURL,
    });
  });

  it('charge le contenu authentifié et affiche un PDF dans la modale', async () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    const unwrap = vi.fn().mockResolvedValue(blob);
    const onClose = vi.fn();

    mocks.loadWorkspaceFilePreview.mockReturnValue({ unwrap });
    mocks.createObjectURL.mockReturnValue('blob:preview-pdf');

    const { unmount } = render(
      <FilePreviewDialog
        file={pdfFile}
        onClose={onClose}
        open
        workspaceId="workspace-1"
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await waitFor(() => {
      expect(mocks.loadWorkspaceFilePreview).toHaveBeenCalledWith({
        workspaceId: 'workspace-1',
        fileId: 'file-1',
      });
    });

    expect(mocks.createObjectURL).toHaveBeenCalledWith(blob);
    expect(
      await screen.findByTitle('Prévisualisation de contrat.pdf'),
    ).toHaveAttribute('src', 'blob:preview-pdf');

    unmount();
    expect(mocks.revokeObjectURL).toHaveBeenCalledWith('blob:preview-pdf');
  });

  it('affiche un refus backend sans quitter la modale', async () => {
    const unwrap = vi.fn().mockRejectedValue({
      data: { message: 'Prévisualisation interdite' },
    });

    mocks.loadWorkspaceFilePreview.mockReturnValue({ unwrap });

    render(
      <FilePreviewDialog
        file={pdfFile}
        onClose={vi.fn()}
        open
        workspaceId="workspace-1"
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Prévisualisation interdite',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('ferme la modale via le bouton partagé', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const unwrap = vi.fn().mockResolvedValue(
      new Blob(['pdf'], { type: 'application/pdf' }),
    );

    mocks.loadWorkspaceFilePreview.mockReturnValue({ unwrap });
    mocks.createObjectURL.mockReturnValue('blob:preview-pdf');

    render(
      <FilePreviewDialog
        file={pdfFile}
        onClose={onClose}
        open
        workspaceId="workspace-1"
      />,
    );

    await screen.findByTitle('Prévisualisation de contrat.pdf');
    await user.click(screen.getByRole('button', { name: 'Fermer' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
