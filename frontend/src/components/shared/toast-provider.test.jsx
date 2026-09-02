import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_TOAST_DURATION,
  ToastProvider,
  useToast,
} from '@/components/shared/toast-provider';

function ToastHarness() {
  const { toast } = useToast();

  return (
    <div>
      <button
        onClick={() =>
          toast({
            title: 'Workspace mis à jour',
            description: 'Le nom a bien été enregistré.',
            variant: 'success',
          })
        }
        type="button"
      >
        Succès
      </button>
      <button
        onClick={() =>
          toast({
            title: 'Modification impossible',
            description: 'Workspace indisponible',
            variant: 'error',
          })
        }
        type="button"
      >
        Erreur
      </button>
    </div>
  );
}

describe('ToastProvider', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('affiche un toast et permet sa fermeture manuelle', () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Succès' }));

    expect(screen.getByRole('status')).toHaveTextContent('Workspace mis à jour');
    expect(screen.getByText('Le nom a bien été enregistré.')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Fermer la notification' }),
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('retire automatiquement un toast après cinq secondes par défaut', () => {
    vi.useFakeTimers();

    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Succès' }));
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(DEFAULT_TOAST_DURATION);
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('annonce les erreurs comme alertes accessibles', () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Erreur' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Modification impossible');
    expect(screen.getByText('Workspace indisponible')).toBeInTheDocument();
  });
});
