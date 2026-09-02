import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

const useChangePasswordMutationMock = vi.hoisted(() => vi.fn());
const useLogoutAllMutationMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth/api/auth-api', () => ({
  useChangePasswordMutation: useChangePasswordMutationMock,
  useLogoutAllMutation: useLogoutAllMutationMock,
}));

import { SecurityPage } from '@/features/account/pages/security-page';

function renderSecurityPage() {
  const router = createMemoryRouter(
    [
      { path: '/account/security', Component: SecurityPage },
      { path: '/login', Component: () => <h1>Connexion cible</h1> },
    ],
    { initialEntries: ['/account/security'] },
  );

  render(<RouterProvider router={router} />);
  return router;
}

describe('SecurityPage', () => {
  const changePasswordMock = vi.fn();
  const changePasswordUnwrapMock = vi.fn();
  const logoutAllMock = vi.fn();
  const logoutAllUnwrapMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    changePasswordUnwrapMock.mockResolvedValue(undefined);
    changePasswordMock.mockReturnValue({ unwrap: changePasswordUnwrapMock });
    useChangePasswordMutationMock.mockReturnValue([
      changePasswordMock,
      { isLoading: false },
    ]);

    logoutAllUnwrapMock.mockResolvedValue(undefined);
    logoutAllMock.mockReturnValue({ unwrap: logoutAllUnwrapMock });
    useLogoutAllMutationMock.mockReturnValue([
      logoutAllMock,
      { isLoading: false },
    ]);
  });

  afterEach(() => cleanup());

  it('change le mot de passe sans envoyer le champ de confirmation puis impose la reconnexion', async () => {
    const user = userEvent.setup();
    const router = renderSecurityPage();

    await user.type(screen.getByLabelText('Mot de passe actuel'), 'mot-de-passe-actuel-long');
    await user.type(screen.getByLabelText('Nouveau mot de passe'), 'nouveau-mot-de-passe-long');
    await user.type(
      screen.getByLabelText('Confirmer le nouveau mot de passe'),
      'nouveau-mot-de-passe-long',
    );
    await user.click(screen.getByRole('button', { name: 'Modifier le mot de passe' }));

    await waitFor(() => {
      expect(changePasswordMock).toHaveBeenCalledWith({
        currentPassword: 'mot-de-passe-actuel-long',
        newPassword: 'nouveau-mot-de-passe-long',
      });
    });
    expect(await screen.findByRole('heading', { name: 'Connexion cible' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.state).toEqual({ passwordChanged: true });
  });

  it('exige une confirmation avant de révoquer toutes les sessions', async () => {
    const user = userEvent.setup();
    const router = renderSecurityPage();

    await user.click(screen.getByRole('button', { name: 'Déconnecter tous les appareils' }));
    expect(logoutAllMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Confirmer' }));

    await waitFor(() => {
      expect(logoutAllMock).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByRole('heading', { name: 'Connexion cible' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.state).toEqual({ sessionsRevoked: true });
  });
});
