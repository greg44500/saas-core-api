import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EntityDetailsDrawer } from './entity-details-drawer';

describe('EntityDetailsDrawer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (callback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    document.body.style.overflow = '';
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('applique le style partagé et conserve le drawer monté pendant la fermeture', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <EntityDetailsDrawer onClose={onClose} open title="Détails">
        <p>Contenu</p>
      </EntityDetailsDrawer>,
    );

    const drawer = screen.getByRole('dialog');

    expect(drawer).toHaveClass('shadow-lg');
    expect(drawer).toHaveClass('transition-transform');
    expect(drawer).toHaveClass('duration-300');
    expect(drawer).toHaveClass('ease-in-out');
    expect(drawer).toHaveClass('translate-x-0');

    rerender(
      <EntityDetailsDrawer onClose={onClose} open={false} title="Détails">
        <p>Contenu</p>
      </EntityDetailsDrawer>,
    );

    const closingDrawer = screen.getByRole('dialog', { hidden: true });

    expect(closingDrawer).toHaveAttribute('aria-hidden', 'true');
    expect(closingDrawer).toHaveClass('ease-in-out');
    expect(closingDrawer).toHaveClass('translate-x-full');

    act(() => {
      vi.advanceTimersByTime(299);
    });

    expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(screen.queryByRole('dialog', { hidden: true })).not.toBeInTheDocument();
  });

  it('rend le drawer dans document.body pour rester attaché au viewport', () => {
    const { container } = render(
      <div data-testid="local-container">
        <EntityDetailsDrawer onClose={vi.fn()} open title="Détails">
          <p>Contenu</p>
        </EntityDetailsDrawer>
      </div>,
    );

    const drawer = screen.getByRole('dialog');

    expect(container).not.toContainElement(drawer);
    expect(document.body).toContainElement(drawer);
  });

  it('utilise un backdrop décoratif et le niveau de layer du Design System', () => {
    render(
      <EntityDetailsDrawer onClose={vi.fn()} open title="Détails">
        <p>Contenu</p>
      </EntityDetailsDrawer>,
    );

    const drawer = screen.getByRole('dialog');
    const overlay = drawer.previousElementSibling;

    expect(drawer.parentElement).toHaveClass('z-[var(--layer-drawer)]');
    expect(overlay).toHaveAttribute('aria-hidden', 'true');
    expect(overlay).toHaveClass(
      'bg-overlay/45',
      'transition-opacity',
      'duration-300',
      'ease-in-out',
      'opacity-100',
    );
  });

  it('déplace la description visuelle vers l’aide contextuelle sans casser aria-describedby', () => {
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

    const drawer = screen.getByRole('dialog');
    const infoButton = screen.getByRole('button', { name: 'À propos de Détails' });
    const description = screen.getByText('Informations détaillées sur cette entité.');

    expect(infoButton).toBeInTheDocument();
    expect(description).toHaveClass('sr-only');
    expect(drawer).toHaveAttribute('aria-describedby', description.id);
  });

  it('place le focus dans la modale, boucle Tab et ferme avec Escape', () => {
    const onClose = vi.fn();

    render(
      <EntityDetailsDrawer onClose={onClose} open title="Détails">
        <button type="button">Action interne</button>
      </EntityDetailsDrawer>,
    );

    const closeButton = screen.getByRole('button', { name: 'Fermer' });
    const actionButton = screen.getByRole('button', { name: 'Action interne' });

    expect(closeButton).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(actionButton).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
