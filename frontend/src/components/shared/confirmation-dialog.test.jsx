import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';

describe('ConfirmationDialog', () => {
  it('ne rend pas de modale lorsque la confirmation est fermée', () => {
    render(
      <ConfirmationDialog
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        open={false}
        title="Confirmer"
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('délègue à Base UI la structure accessible, le focus initial et Escape', async () => {
    const onCancel = vi.fn();

    render(
      <ConfirmationDialog
        confirmLabel="Supprimer"
        description="Action irréversible"
        onCancel={onCancel}
        onConfirm={vi.fn()}
        title="Supprimer ?"
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Supprimer ?' });
    const overlay = document.querySelector('[data-slot="dialog-overlay"]');
    const cancelButton = screen.getByRole('button', { name: 'Annuler' });

    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAccessibleDescription('Action irréversible');
    expect(overlay).toHaveClass('backdrop-blur-sm');
    await waitFor(() => expect(cancelButton).toHaveFocus());

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('ferme via l’action Annuler sans dupliquer le callback métier', () => {
    const onCancel = vi.fn();

    render(
      <ConfirmationDialog
        onCancel={onCancel}
        onConfirm={vi.fn()}
        title="Confirmer"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('transmet la confirmation au callback métier', () => {
    const onConfirm = vi.fn();

    render(
      <ConfirmationDialog
        confirmLabel="Valider"
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        title="Confirmer"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('verrouille toutes les actions de fermeture métier pendant pending', () => {
    const onCancel = vi.fn();

    render(
      <ConfirmationDialog
        onCancel={onCancel}
        onConfirm={vi.fn()}
        pending
        pendingLabel="Traitement…"
        title="Confirmer"
      />,
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Confirmer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Traitement…' })).toBeDisabled();
  });

  it('affiche le contenu métier, l’erreur et l’état pending sans les interpréter', () => {
    render(
      <ConfirmationDialog
        confirmLabel="Valider"
        errorMessage="Le serveur refuse cette action."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        pending
        pendingLabel="Validation…"
        title="Action commerciale"
      >
        <p>Contexte métier</p>
      </ConfirmationDialog>,
    );

    expect(screen.getByText('Contexte métier')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Le serveur refuse cette action.');
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Validation…' })).toBeDisabled();
  });
});
