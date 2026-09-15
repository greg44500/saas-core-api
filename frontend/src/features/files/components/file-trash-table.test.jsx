import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FileTrashTable } from '@/features/files/components/file-trash-table';

const deletedFile = {
  id: 'file-1',
  originalName: 'contrat.pdf',
  category: 'document',
  sizeBytes: 2048,
  deletedAt: '2026-09-01T10:00:00.000Z',
  purgeScheduledAt: '2026-10-01T10:00:00.000Z',
};

function renderTable() {
  return render(
    <FileTrashTable
      canDeletePermanently
      canRestore
      deletingFileId={null}
      files={[deletedFile]}
      onDeletePermanently={vi.fn()}
      onRestore={vi.fn()}
      restoringFileId={null}
    />,
  );
}

describe('FileTrashTable', () => {
  afterEach(() => {
    cleanup();
  });

  it('met la ligne en surbrillance au survol et au focus clavier', () => {
    renderTable();

    const row = screen.getByText('contrat.pdf').closest('tr');

    expect(row).toHaveClass('hover:bg-accent/40');
    expect(row).toHaveClass('focus-within:bg-accent/40');
  });

  it('conserve un nom accessible précis mais affiche un tooltip Restaurer concis', async () => {
    const user = userEvent.setup();
    renderTable();

    const restoreButton = screen.getByRole('button', {
      name: 'Restaurer contrat.pdf',
    });

    await user.hover(restoreButton);

    expect(await screen.findByText('Restaurer')).toBeInTheDocument();
    expect(screen.queryByText('Restaurer contrat.pdf')).not.toBeInTheDocument();
  });

  it('nomme explicitement l’action irréversible', async () => {
    const user = userEvent.setup();
    renderTable();

    const deleteButton = screen.getByRole('button', {
      name: 'Supprimer définitivement contrat.pdf',
    });

    await user.hover(deleteButton);

    expect(
      await screen.findByText('Supprimer définitivement'),
    ).toBeInTheDocument();
  });
});
