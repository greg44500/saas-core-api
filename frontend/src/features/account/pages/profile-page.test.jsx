import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/shared/toast-provider';

const useGetCurrentUserQueryMock = vi.hoisted(() => vi.fn());
const useUpdateCurrentUserMutationMock = vi.hoisted(() => vi.fn());
const useGetCurrentPlatformContextQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth/api/auth-api', () => ({
  useGetCurrentUserQuery: useGetCurrentUserQueryMock,
  useUpdateCurrentUserMutation: useUpdateCurrentUserMutationMock,
}));

vi.mock('@/features/platform/api/platform-current-context-api', () => ({
  useGetCurrentPlatformContextQuery: useGetCurrentPlatformContextQueryMock,
}));

import { ProfilePage } from '@/features/account/pages/profile-page';

describe('ProfilePage', () => {
  const updateCurrentUserMock = vi.fn();
  const unwrapMock = vi.fn();
  const refetchMock = vi.fn();

  function renderPage() {
    return render(
      <ToastProvider>
        <ProfilePage />
      </ToastProvider>,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    useGetCurrentUserQueryMock.mockReturnValue({
      data: {
        id: 'user-1',
        firstName: 'Greg',
        lastName: 'Martin',
        email: 'greg@example.com',
        emailVerifiedAt: '2026-09-01T10:00:00.000Z',
      },
      isError: false,
      isLoading: false,
      refetch: refetchMock,
    });
    useGetCurrentPlatformContextQueryMock.mockReturnValue({
      data: {
        isFounder: true,
        status: 'active',
        role: { name: 'Super administrateur' },
      },
    });
    unwrapMock.mockResolvedValue({
      id: 'user-1',
      firstName: 'Gregory',
      lastName: 'Martin',
      email: 'greg@example.com',
      emailVerifiedAt: '2026-09-01T10:00:00.000Z',
    });
    updateCurrentUserMock.mockReturnValue({ unwrap: unwrapMock });
    useUpdateCurrentUserMutationMock.mockReturnValue([
      updateCurrentUserMock,
      { isLoading: false },
    ]);
  });

  afterEach(() => cleanup());

  it('affiche la distinction Platform à côté du titre et garde l’email non modifiable', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByLabelText('Prénom')).toHaveValue('Greg');
    });

    expect(screen.getByRole('heading', { name: 'Profil' })).toBeInTheDocument();
    expect(screen.getByText('Fondateur')).toBeInTheDocument();
    expect(screen.queryByText('Profil :')).not.toBeInTheDocument();
    expect(screen.queryByText('Super administrateur')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Nom')).toHaveValue('Martin');
    expect(screen.getByLabelText('Adresse email')).toHaveValue('greg@example.com');
    expect(screen.getByLabelText('Adresse email')).toBeDisabled();
    expect(screen.getByText('Adresse email vérifiée.')).toBeInTheDocument();
  });

  it('envoie uniquement le champ réellement modifié et confirme par toast', async () => {
    const user = userEvent.setup();
    renderPage();

    const firstNameInput = await screen.findByLabelText('Prénom');
    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'Gregory');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => {
      expect(updateCurrentUserMock).toHaveBeenCalledWith({
        firstName: 'Gregory',
      });
    });
    expect(unwrapMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('status')).toHaveTextContent('Profil mis à jour');
  });

  it('présente une erreur serveur de mise à jour dans un toast', async () => {
    const user = userEvent.setup();
    unwrapMock.mockRejectedValue({ data: { message: 'Profil indisponible' } });
    renderPage();

    const firstNameInput = await screen.findByLabelText('Prénom');
    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'Gregory');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Mise à jour impossible');
    expect(alert).toHaveTextContent('Profil indisponible');
  });
});
