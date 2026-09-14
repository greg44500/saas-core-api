import { useRef } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_TOAST_DURATION,
  ToastProvider,
  useToast,
} from '@/components/shared/toast-provider';
import { findToastByText } from '@/test/toast-assertions';

function ToastHarness() {
  const { dismissToast, toast } = useToast();
  const persistentToastIdRef = useRef(null);

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
      <button
        onClick={() => {
          persistentToastIdRef.current = toast({
            duration: 0,
            title: 'Notification persistante',
            variant: 'warning',
          });
        }}
        type="button"
      >
        Persistant
      </button>
      <button
        onClick={() => dismissToast(persistentToastIdRef.current)}
        type="button"
      >
        Fermer programmatiquement
      </button>
    </div>
  );
}

function renderToastProvider() {
  return render(
    <ToastProvider>
      <ToastHarness />
    </ToastProvider>,
  );
}

function getToastElement() {
  return document.querySelector('[data-slot="toast"]');
}

describe('ToastProvider', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('affiche un toast et permet sa fermeture manuelle', async () => {
    renderToastProvider();

    fireEvent.click(screen.getByRole('button', { name: 'Succès' }));

    const toast = await findToastByText('Workspace mis à jour');

    expect(toast).toHaveAttribute('data-type', 'success');
    expect(within(toast).getByText('Le nom a bien été enregistré.')).toBeVisible();

    fireEvent.click(
      within(toast).getByRole('button', { name: 'Fermer la notification' }),
    );

    await waitFor(() => {
      expect(getToastElement()).not.toBeInTheDocument();
    });
  });

  it('retire automatiquement un toast après cinq secondes par défaut', () => {
    vi.useFakeTimers();
    renderToastProvider();

    fireEvent.click(screen.getByRole('button', { name: 'Succès' }));
    expect(getToastElement()).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(DEFAULT_TOAST_DURATION);
      vi.runOnlyPendingTimers();
    });

    expect(getToastElement()).not.toBeInTheDocument();
  });

  it('mappe une erreur applicative vers le ton destructif Base UI', async () => {
    renderToastProvider();

    fireEvent.click(screen.getByRole('button', { name: 'Erreur' }));

    const toast = await findToastByText('Modification impossible');

    expect(toast).toHaveAttribute('data-type', 'destructive');
    expect(toast).toHaveClass('border-destructive/40');
    expect(within(toast).getByText('Workspace indisponible')).toBeVisible();
  });

  it('conserve les toasts persistants et la fermeture programmatique', async () => {
    renderToastProvider();

    fireEvent.click(screen.getByRole('button', { name: 'Persistant' }));

    const toast = await findToastByText('Notification persistante');
    expect(toast).toHaveAttribute('data-type', 'warning');

    fireEvent.click(
      screen.getByRole('button', { name: 'Fermer programmatiquement' }),
    );

    await waitFor(() => {
      expect(getToastElement()).not.toBeInTheDocument();
    });
  });
});
