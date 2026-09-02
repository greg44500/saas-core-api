import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const useGetCurrentUserQueryMock = vi.hoisted(() => vi.fn());
const useUpdateCurrentUserMutationMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth/api/auth-api', () => ({
  useGetCurrentUserQuery: useGetCurrentUserQueryMock,
  useUpdateCurrentUserMutation: useUpdateCurrentUserMutationMock,
}));

import { ProfilePage } from '@/features/account/pages/profile-page';

describe('ProfilePage', () => {
  const updateCurrentUserMock = vi.fn();
  const unwrapMock = vi.fn();
  const refetchMock = vi.fn();

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

  it('affiche le profil et garde l’email non modifiable', async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Prénom')).toHaveValue('Greg');
    });
    expect(screen.getByLabelText('Nom')).toHaveValue('Martin');
    expect(screen.getByLabelText('Adresse email')).toHaveValue('greg@example.com');
    expect(screen.getByLabelText('Adresse email')).toBeDisabled();
    expect(screen.getByText('Adresse email vérifiée.')).toBeInTheDocument();
  });

  it('envoie uniquement le champ réellement modifié', async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

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
    expect(await screen.findByRole('status')).toHaveTextContent('Profil mis à jour.');
  });
});
