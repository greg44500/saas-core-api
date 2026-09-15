import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EntityDetailsDrawer } from './entity-details-drawer';

afterEach(() => {
  document.body.style.overflow = '';
});

describe('EntityDetailsDrawer', () => {
  it('conserve le style, le positionnement et la transition du drawer partagé', () => {
    render(
      <EntityDetailsDrawer onClose={vi.fn()} open title="Détails">
        <p>Contenu</p>
      </EntityDetailsDrawer>,
    );

    const drawer = screen.getByRole('dialog', { name: 'Détails' });

    expect(drawer).toHaveClass(
      'bottom-0',
      'top-16',
      'w-full',
      'max-w-xl',
      'shadow-lg',
      'transition-transform',
      'duration-300',
      'ease-in-out',
      'data-ending-style:translate-x-full',
      'data-starting-style:translate-x-full',
    );
  });

  it('rend le drawer dans document.body pour rester attaché au viewport', () => {
    const { container } = render(
      <div data-testid="local-container">
        <EntityDetailsDrawer onClose={vi.fn()} open title="Détails">
          <p>Contenu</p>
        </EntityDetailsDrawer>
      </div>,
    );

    const drawer = screen.getByRole('dialog', { name: 'Détails' });

    expect(container).not.toContainElement(drawer);
    expect(document.body).toContainElement(drawer);
  });

  it('conserve le backdrop sous la topbar et le layer du Design System', () => {
    render(
      <EntityDetailsDrawer onClose={vi.fn()} open title="Détails">
        <p>Contenu</p>
      </EntityDetailsDrawer>,
    );

    const drawer = screen.getByRole('dialog', { name: 'Détails' });
    const overlay = document.querySelector('[data-slot="sheet-overlay"]');

    expect(drawer).toHaveClass('z-[calc(var(--layer-drawer)+1)]');
    expect(overlay).toHaveClass(
      'top-16',
      'z-[var(--layer-drawer)]',
      'bg-overlay/45',
      'transition-opacity',
      'duration-300',
      'ease-in-out',
    );
  });

  it('déplace la description visuelle vers l’aide contextuelle sans casser la description accessible', () => {
    render(
      <EntityDetailsDrawer
        description="Informations détaillées sur cette entité."
        onClose={vi.fn()}
        open
        title="Détails"
      >
        <p>Contenu</p>
      </EntityDetailsDrawer>,
    );

    const drawer = screen.getByRole('dialog', { name: 'Détails' });
    const infoButton = screen.getByRole('button', { name: 'À propos de Détails' });
    const description = screen.getByText('Informations détaillées sur cette entité.');

    expect(infoButton).toBeInTheDocument();
    expect(description).toHaveClass('sr-only');
    expect(drawer).toHaveAccessibleDescription('Informations détaillées sur cette entité.');
  });

  it('délègue à Base UI le focus modal, la boucle Tab et Escape', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <EntityDetailsDrawer onClose={onClose} open title="Détails">
        <button type="button">Action interne</button>
      </EntityDetailsDrawer>,
    );

    const closeButton = screen.getByRole('button', { name: 'Fermer' });
    const actionButton = screen.getByRole('button', { name: 'Action interne' });

    await waitFor(() => expect(closeButton).toHaveFocus());

    await user.tab({ shift: true });
    expect(actionButton).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ferme via le bouton partagé sans dupliquer le callback métier', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <EntityDetailsDrawer onClose={onClose} open title="Détails">
        <p>Contenu</p>
      </EntityDetailsDrawer>,
    );

    await user.click(screen.getByRole('button', { name: 'Fermer' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ferme via le backdrop sans modifier le contrat métier', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <EntityDetailsDrawer onClose={onClose} open title="Détails">
        <p>Contenu</p>
      </EntityDetailsDrawer>,
    );

    const overlay = document.querySelector('[data-slot="sheet-overlay"]');

    await user.click(overlay);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('restaure le focus sur le déclencheur après fermeture contrôlée', async () => {
    const user = userEvent.setup();

    function DrawerHarness() {
      const [open, setOpen] = useState(false);

      return (
        <>
          <button onClick={() => setOpen(true)} type="button">
            Ouvrir les détails
          </button>
          <EntityDetailsDrawer
            onClose={() => setOpen(false)}
            open={open}
            title="Détails"
          >
            <p>Contenu</p>
          </EntityDetailsDrawer>
        </>
      );
    }

    render(<DrawerHarness />);

    const trigger = screen.getByRole('button', { name: 'Ouvrir les détails' });
    await user.click(trigger);

    const closeButton = await screen.findByRole('button', { name: 'Fermer' });
    await waitFor(() => expect(closeButton).toHaveFocus());

    await user.click(closeButton);

    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
