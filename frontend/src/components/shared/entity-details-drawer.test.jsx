import { act, render, screen } from '@testing-library/react';
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

    expect(drawer).toHaveClass('shadow-xl');
    expect(drawer).toHaveClass('transition-transform');
    expect(drawer).toHaveClass('duration-300');
    expect(drawer).toHaveClass('translate-x-0');

    rerender(
      <EntityDetailsDrawer onClose={onClose} open={false} title="Détails">
        <p>Contenu</p>
      </EntityDetailsDrawer>,
    );

    const closingDrawer = screen.getByRole('dialog', { hidden: true });

    expect(closingDrawer).toHaveAttribute('aria-hidden', 'true');
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

  it('anime également le voile de fond', () => {
    render(
      <EntityDetailsDrawer onClose={vi.fn()} open title="Détails">
        <p>Contenu</p>
      </EntityDetailsDrawer>,
    );

    expect(screen.getByRole('button', { name: 'Fermer le panneau de détails' })).toHaveClass(
      'transition-opacity',
      'duration-300',
      'opacity-100',
    );
  });
});
