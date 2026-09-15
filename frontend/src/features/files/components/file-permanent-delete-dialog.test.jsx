import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FilePermanentDeleteDialog } from '@/features/files/components/file-permanent-delete-dialog';

const file = {
  id: 'file-1',
  originalName: 'contrat.pdf',
};

describe('FilePermanentDeleteDialog', () => {
  afterEach(() => {
    cleanup();
  });

  it('explique explicitement le caractère irréversible avant confirmation', () => {
    render(
      <FilePermanentDeleteDialog
        errorMessage={null}
        file={file}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        open
        pending={false}
      />,
    );

    expect(
      screen.getByRole('dialog', {
        name: 'Supprimer définitivement ce fichier ?',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('contrat.pdf')).toBeInTheDocument();
    expect(screen.getByText(/Cette action est irréversible/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Supprimer définitivement' }),
    ).toBeInTheDocument();
  });

  it('appelle la confirmation uniquement après action explicite', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <FilePermanentDeleteDialog
        errorMessage={null}
        file={file}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        open
        pending={false}
      />,
    );

    expect(onConfirm).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole('button', { name: 'Supprimer définitivement' }),
    );

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('bloque les actions pendant la suppression définitive', () => {
    render(
      <FilePermanentDeleteDialog
        errorMessage={null}
        file={file}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        open
        pending
      />,
    );

    expect(screen.getByRole('button', { name: 'Annuler' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Suppression définitive…' }),
    ).toBeDisabled();
  });
});
