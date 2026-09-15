import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FileDeleteDialog } from '@/features/files/components/file-delete-dialog';

const file = {
  id: 'file-1',
  originalName: 'contrat.pdf',
};

describe('FileDeleteDialog', () => {
  afterEach(() => {
    cleanup();
  });

  it('explique la rétention et la restauration depuis la corbeille', () => {
    render(
      <FileDeleteDialog
        errorMessage={null}
        file={file}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        open
        pending={false}
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('contrat.pdf')).toBeInTheDocument();
    expect(screen.getByText(/au maximum 30 jours/i)).toBeInTheDocument();
    expect(screen.getByText(/restaurer depuis la Corbeille/i)).toBeInTheDocument();
    expect(screen.getByText(/suppression définitive/i)).toBeInTheDocument();
    expect(screen.queryByText(/purge/i)).not.toBeInTheDocument();
  });

  it('délègue explicitement confirmation et annulation', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    render(
      <FileDeleteDialog
        errorMessage={null}
        file={file}
        onCancel={onCancel}
        onConfirm={onConfirm}
        open
        pending={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Retirer le fichier' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('affiche l’erreur du backend sans fermer implicitement le dialogue', () => {
    render(
      <FileDeleteDialog
        errorMessage="Fichier introuvable"
        file={file}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        open
        pending={false}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Fichier introuvable');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
