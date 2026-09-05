import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';

afterEach(() => {
  document.body.style.overflow = '';
});

describe('ConfirmationDialog', () => {
  it('ne rend rien lorsque la confirmation est fermée', () => {
    const { container } = render(
      <ConfirmationDialog
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        open={false}
        title="Confirmer"
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('centralise le focus, Escape, le verrouillage du scroll et le backdrop', () => {
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

    expect(dialog).toBeInTheDocument();
    expect(dialog.parentElement).toHaveClass('backdrop-blur-sm');
    expect(screen.getByRole('button', { name: 'Annuler' })).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onCancel).toHaveBeenCalledTimes(1);
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
    expect(screen.getByRole('button', { name: 'Validation…' })).toBeDisabled();
  });
});
