import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

const useForgotPasswordMutationMock = vi.hoisted(() => vi.fn());
const useResetPasswordMutationMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth/api/auth-api', () => ({
  useForgotPasswordMutation: useForgotPasswordMutationMock,
  useResetPasswordMutation: useResetPasswordMutationMock,
}));

import { ForgotPasswordPage } from '@/features/auth/pages/forgot-password-page';
import { ResetPasswordPage } from '@/features/auth/pages/reset-password-page';

function renderRecoveryRoute(initialEntry) {
  const router = createMemoryRouter(
    [
      { path: '/forgot-password', Component: ForgotPasswordPage },
      { path: '/reset-password', Component: ResetPasswordPage },
      { path: '/login', Component: () => <h1>Connexion cible</h1> },
    ],
    { initialEntries: [initialEntry] },
  );

  render(<RouterProvider router={router} />);
  return router;
}

describe('password recovery pages', () => {
  const forgotPasswordMock = vi.fn();
  const forgotUnwrapMock = vi.fn();
  const resetPasswordMock = vi.fn();
  const resetUnwrapMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    forgotUnwrapMock.mockResolvedValue({
      message: 'Si un compte correspond à cette adresse email, un lien de réinitialisation a été envoyé.',
    });
    forgotPasswordMock.mockReturnValue({ unwrap: forgotUnwrapMock });
    useForgotPasswordMutationMock.mockReturnValue([
      forgotPasswordMock,
      { isLoading: false },
    ]);

    resetUnwrapMock.mockResolvedValue({ status: 'success' });
    resetPasswordMock.mockReturnValue({ unwrap: resetUnwrapMock });
    useResetPasswordMutationMock.mockReturnValue([
      resetPasswordMock,
      { isLoading: false },
    ]);
  });

  afterEach(() => cleanup());

  it('conserve la réponse générique du backend pour forgot-password', async () => {
    const user = userEvent.setup();
    renderRecoveryRoute('/forgot-password');

    await user.type(screen.getByLabelText('Email'), 'greg@example.com');
    await user.click(screen.getByRole('button', { name: 'Envoyer le lien' }));

    expect(forgotPasswordMock).toHaveBeenCalledWith({ email: 'greg@example.com' });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Si un compte correspond à cette adresse email',
    );
  });

  it('transmet uniquement le token du lien et le nouveau mot de passe au reset', async () => {
    const user = userEvent.setup();
    const router = renderRecoveryRoute('/reset-password?token=opaque-token');

    await user.type(screen.getByLabelText('Nouveau mot de passe'), 'nouveau-mot-de-passe-long');
    await user.type(screen.getByLabelText('Confirmer le nouveau mot de passe'), 'nouveau-mot-de-passe-long');
    await user.click(screen.getByRole('button', { name: 'Réinitialiser le mot de passe' }));

    await waitFor(() => {
      expect(resetPasswordMock).toHaveBeenCalledWith({
        token: 'opaque-token',
        newPassword: 'nouveau-mot-de-passe-long',
      });
    });
    expect(await screen.findByRole('heading', { name: 'Connexion cible' })).toBeInTheDocument();
    expect(router.state.location.state).toEqual({ resetPasswordSuccess: true });
  });

  it('refuse de présenter le formulaire de reset sans token', () => {
    renderRecoveryRoute('/reset-password');

    expect(
      screen.getByRole('heading', { name: 'Lien de réinitialisation invalide' }),
    ).toBeInTheDocument();
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });
});
