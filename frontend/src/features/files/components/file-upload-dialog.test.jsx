import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  uploadWorkspaceFile: vi.fn(),
  useUploadWorkspaceFileMutation: vi.fn(),
}));

vi.mock('@/features/files/api/files-api', () => ({
  useUploadWorkspaceFileMutation: mocks.useUploadWorkspaceFileMutation,
}));

import { FileUploadDialog } from '@/features/files/components/file-upload-dialog';
import { WorkspaceProvider } from '@/features/workspace/components/workspace-context';

const workspace = { id: 'workspace-1', name: 'Acme', status: 'active' };
const membership = { id: 'membership-1', role: { key: 'member', name: 'Membre' } };

function renderDialog(props = {}) {
  return render(
    <WorkspaceProvider
      membership={membership}
      permissions={[]}
      workspace={workspace}
    >
      <FileUploadDialog
        onClose={vi.fn()}
        onUploaded={vi.fn()}
        open
        {...props}
      />
    </WorkspaceProvider>,
  );
}

describe('FileUploadDialog', () => {
  beforeEach(() => {
    mocks.uploadWorkspaceFile.mockReset();
    mocks.useUploadWorkspaceFileMutation.mockReset();
    mocks.useUploadWorkspaceFileMutation.mockReturnValue([
      mocks.uploadWorkspaceFile,
      { isLoading: false },
    ]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('utilise une modale accessible et place le focus sur la première action utile', async () => {
    renderDialog();

    expect(
      screen.getByRole('dialog', { name: 'Ajouter un fichier' }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Choisir un fichier' }),
      ).toHaveFocus();
    });
  });

  it('ferme la modale avec Escape quand aucun téléversement n’est en cours', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    renderDialog({ onClose });

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('bloque la fermeture et rend le traitement visible pendant un téléversement', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    mocks.useUploadWorkspaceFileMutation.mockReturnValue([
      mocks.uploadWorkspaceFile,
      { isLoading: true },
    ]);

    const { container } = renderDialog({ onClose });

    expect(screen.getByRole('button', { name: 'Annuler' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Vérification et enregistrement…' }),
    ).toBeDisabled();
    expect(container.querySelector('[data-slot="spinner"]')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Le serveur vérifie le fichier avant de l’ajouter au workspace.',
    );

    await user.keyboard('{Escape}');

    expect(onClose).not.toHaveBeenCalled();
  });

  it('affiche un sélecteur de fichier entièrement maîtrisé en français', async () => {
    const user = userEvent.setup();
    const file = new File(['pdf'], 'contrat.pdf', { type: 'application/pdf' });

    renderDialog();

    expect(screen.getByText('Aucun fichier sélectionné.')).toBeInTheDocument();
    expect(screen.getByText('Choisir un fichier')).toBeInTheDocument();

    await user.upload(screen.getByLabelText('Fichier'), file);

    expect(screen.getByText('contrat.pdf')).toBeInTheDocument();
    expect(screen.queryByText('Aucun fichier sélectionné.')).not.toBeInTheDocument();
  });

  it('envoie le fichier et la catégorie au workspace courant', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onUploaded = vi.fn();
    const uploadedFile = { id: 'file-1', originalName: 'contrat.pdf' };
    const unwrap = vi.fn().mockResolvedValue(uploadedFile);
    const file = new File(['pdf'], 'contrat.pdf', { type: 'application/pdf' });

    mocks.uploadWorkspaceFile.mockReturnValue({ unwrap });

    renderDialog({ onClose, onUploaded });

    await user.upload(screen.getByLabelText('Fichier'), file);
    await user.click(screen.getByRole('combobox', { name: 'Catégorie' }));
    await user.click(screen.getByRole('option', { name: 'Document' }));
    await user.click(screen.getByRole('button', { name: 'Téléverser' }));

    expect(mocks.uploadWorkspaceFile).toHaveBeenCalledWith({
      workspaceId: 'workspace-1',
      file,
      category: 'document',
    });
    expect(onUploaded).toHaveBeenCalledWith(uploadedFile);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('refuse côté client un type déclaré non autorisé', async () => {
    // Le navigateur filtre normalement ce fichier via accept. On désactive ce
    // comportement dans ce test pour vérifier la seconde barrière Zod du client.
    const user = userEvent.setup({ applyAccept: false });
    const file = new File(['text'], 'notes.txt', { type: 'text/plain' });

    renderDialog();

    await user.upload(screen.getByLabelText('Fichier'), file);
    await user.click(screen.getByRole('button', { name: 'Téléverser' }));

    expect(
      screen.getByRole('alert'),
    ).toHaveTextContent('Seuls les fichiers PDF, JPG et PNG sont acceptés.');
    expect(mocks.uploadWorkspaceFile).not.toHaveBeenCalled();
  });

  it('affiche le message backend quand le plan refuse la fonctionnalité', async () => {
    const user = userEvent.setup();
    const file = new File(['pdf'], 'contrat.pdf', { type: 'application/pdf' });
    const unwrap = vi.fn().mockRejectedValue({
      status: 403,
      data: {
        message: 'Cette fonctionnalité n’est pas incluse dans le plan du workspace.',
      },
    });

    mocks.uploadWorkspaceFile.mockReturnValue({ unwrap });

    renderDialog();
    await user.upload(screen.getByLabelText('Fichier'), file);
    await user.click(screen.getByRole('button', { name: 'Téléverser' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Cette fonctionnalité n’est pas incluse dans le plan du workspace.',
    );
  });

  it('affiche le message backend pour un dépassement de taille ou de quota', async () => {
    const user = userEvent.setup();
    const file = new File(['pdf'], 'contrat.pdf', { type: 'application/pdf' });
    const unwrap = vi.fn().mockRejectedValue({
      status: 413,
      data: { message: 'Le fichier dépasse la taille maximale autorisée.' },
    });

    mocks.uploadWorkspaceFile.mockReturnValue({ unwrap });

    renderDialog();
    await user.upload(screen.getByLabelText('Fichier'), file);
    await user.click(screen.getByRole('button', { name: 'Téléverser' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Le fichier dépasse la taille maximale autorisée.',
    );
  });
});
