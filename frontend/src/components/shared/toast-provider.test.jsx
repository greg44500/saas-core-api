import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_TOAST_DURATION,
  ToastProvider,
  normalizeToastVariant,
  useToast,
} from '@/components/shared/toast-provider';

function ToastHarness() {
  const { dismissToast, toast } = useToast();

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
          const id = toast({
            duration: 0,
            title: 'Notification persistante',
            variant: 'warning',
          });
          dismissToast(id);
        }}
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

function getVisibleToast(title) {
  return screen.getByText(title).closest('[data-slot="toast"]');
}

describe('ToastProvider', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('affiche un toast et permet sa fermeture manuelle', async () => {
    renderToastProvider();

    fireEvent.click(screen.getByRole('button', { name: 'Succès' }));

    expect(screen.getByText('Workspace mis à jour')).toBeVisible();
    expect(screen.getByText('Le nom a bien été enregistré.')).toBeVisible();
    expect(getVisibleToast('Workspace mis à jour')).toHaveAttribute('data-type', 'success');

    fireEvent.click(
      screen.getByRole('button', { name: 'Fermer la notification' }),
    );

    await waitFor(() => {
      expect(screen.queryByText('Workspace mis à jour')).not.toBeInTheDocument();
    });
  });

  it('retire automatiquement un toast après cinq secondes par défaut', () => {
    vi.useFakeTimers();
    renderToastProvider();

    fireEvent.click(screen.getByRole('button', { name: 'Succès' }));
    expect(screen.getByText('Workspace mis à jour')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(DEFAULT_TOAST_DURATION);
    });

    expect(screen.queryByText('Workspace mis à jour')).not.toBeInTheDocument();
  });

  it('mappe une erreur applicative vers le ton destructif Base UI', () => {
    renderToastProvider();

    fireEvent.click(screen.getByRole('button', { name: 'Erreur' }));

    const toast = getVisibleToast('Modification impossible');

    expect(toast).toHaveAttribute('data-type', 'destructive');
    expect(toast).toHaveClass('border-destructive/40');
    expect(screen.getByText('Workspace indisponible')).toBeVisible();
  });

  it('conserve la fermeture programmatique via l’identifiant retourné', async () => {
    renderToastProvider();

    fireEvent.click(
      screen.getByRole('button', { name: 'Fermer programmatiquement' }),
    );

    await waitFor(() => {
      expect(screen.queryByText('Notification persistante')).not.toBeInTheDocument();
    });
  });
});

describe('normalizeToastVariant', () => {
  it.each([
    ['success', 'success'],
    ['warning', 'warning'],
    ['info', 'info'],
    ['error', 'destructive'],
    ['destructive', 'destructive'],
    ['inconnue', 'info'],
  ])('normalise %s vers %s', (variant, expected) => {
    expect(normalizeToastVariant(variant)).toBe(expected);
  });
});
