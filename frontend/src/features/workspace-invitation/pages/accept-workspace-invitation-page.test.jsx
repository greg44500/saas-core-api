import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, useLocation } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import {
  clearWorkspaceInvitationTokenInMemory,
} from '@/features/workspace-invitation/lib/workspace-invitation-token';

const mocks = vi.hoisted(() => ({
  acceptExisting: vi.fn(),
  acceptNew: vi.fn(),
  authStatus: 'unauthenticated',
}));

vi.mock('react-redux', () => ({
  useSelector: () => mocks.authStatus,
}));

vi.mock('@/features/auth/api/auth-api', () => ({
  useGetPasswordPolicyQuery: () => ({
    data: {
      minLength: 15,
      maxLength: 128,
      levels: [
        { key: 'weak', label: 'Faible', minScore: 0 },
        { key: 'good', label: 'Correct', minScore: 3 },
        { key: 'strong', label: 'Robuste', minScore: 5 },
      ],
      scoring: {
        lengthBands: [
          { minLength: 15, points: 1 },
          { minLength: 20, points: 1 },
          { minLength: 28, points: 1 },
        ],
        characterClassBands: [
          { minClasses: 2, points: 1 },
          { minClasses: 4, points: 1 },
        ],
        uniqueRatio: { minimum: 0.6, points: 1 },
      },
    },
  }),
}));

vi.mock('@/features/workspace/api/workspace-api', () => ({
  useListWorkspacesQuery: () => ({ data: [] }),
}));

vi.mock('@/features/workspace-invitation/api/workspace-invitation-api', () => ({
  useAcceptWorkspaceInvitationMutation: () => [
    mocks.acceptExisting,
    { isLoading: false },
  ],
  useAcceptNewWorkspaceInvitationMutation: () => [
    mocks.acceptNew,
    { isLoading: false },
  ],
}));

import { AcceptWorkspaceInvitationPage } from '@/features/workspace-invitation/pages/accept-workspace-invitation-page';

const TOKEN = 'a'.repeat(64);

function LoginTarget() {
  const location = useLocation();

  return (
    <div>
      Login cible
      {location.state?.workspaceInvitationAccepted && (
        <span>Invitation workspace acceptée</span>
      )}
      {location.state?.from?.pathname && (
        <span data-testid="login-return-to">
          {`${location.state.from.pathname}${location.state.from.search ?? ''}`}
        </span>
      )}
    </div>
  );
}

function renderPage(path = `/invitations/accept#token=${TOKEN}`) {
  const router = createMemoryRouter(
    [
      {
        path: '/invitations/accept',
        Component: AcceptWorkspaceInvitationPage,
      },
      { path: '/login', Component: LoginTarget },
    ],
    { initialEntries: [path] },
  );

  render(<RouterProvider router={router} />);
  return router;
}

describe('AcceptWorkspaceInvitationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearWorkspaceInvitationTokenInMemory();
    mocks.authStatus = 'unauthenticated';
    mocks.acceptNew.mockImplementation(() => ({
      unwrap: vi.fn().mockResolvedValue({
        id: 'membership-id',
        workspaceId: 'workspace-id',
        roleId: 'role-id',
        status: 'active',
      }),
    }));
    mocks.acceptExisting.mockImplementation(() => ({
      unwrap: vi.fn().mockResolvedValue({
        id: 'membership-id',
        workspaceId: 'workspace-id',
        roleId: 'role-id',
        status: 'active',
      }),
    }));
  });

  afterEach(() => cleanup());

  it('capture le secret depuis le fragment puis nettoie immédiatement l’URL', async () => {
    const router = renderPage();

    await waitFor(() => {
      expect(router.state.location.hash).toBe('');
    });

    expect(router.state.location.search).toBe('');
    expect(router.state.location.state).toBeNull();
    expect(screen.getByLabelText('Prénom')).toBeInTheDocument();
  });

  it('ne demande jamais l’email au nouveau destinataire', () => {
    renderPage();

    expect(screen.getByLabelText('Prénom')).toBeInTheDocument();
    expect(screen.getByLabelText('Nom')).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer mon accès' })).toBeDisabled();
  });

  it('ne place pas le secret dans history.state pendant un passage par le login', async () => {
    const user = userEvent.setup();
    const router = renderPage();

    await waitFor(() => {
      expect(router.state.location.hash).toBe('');
    });

    await user.click(
      screen.getByRole('link', { name: 'Se connecter pour accepter' }),
    );

    expect(screen.getByText('Login cible')).toBeInTheDocument();
    expect(screen.getByTestId('login-return-to')).toHaveTextContent(
      '/invitations/accept',
    );
    expect(screen.getByTestId('login-return-to')).not.toHaveTextContent(TOKEN);
  });

  it('crée le compte puis renvoie vers le login et le workspace accepté', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Prénom'), 'Marie');
    await user.type(screen.getByLabelText('Nom'), 'Martin');
    await user.type(
      screen.getByLabelText('Mot de passe'),
      'Phrase unique pour workspace 47!',
    );
    await user.type(
      screen.getByLabelText('Confirmer le mot de passe'),
      'Phrase unique pour workspace 47!',
    );
    await user.click(
      screen.getByLabelText(/J’accepte les Conditions générales/i),
    );
    await user.click(screen.getByRole('button', { name: 'Créer mon accès' }));

    await waitFor(() => {
      expect(mocks.acceptNew).toHaveBeenCalledWith({
        token: TOKEN,
        firstName: 'Marie',
        lastName: 'Martin',
        password: 'Phrase unique pour workspace 47!',
        legalAccepted: true,
      });
    });

    expect(await screen.findByText('Invitation workspace acceptée')).toBeInTheDocument();
    expect(screen.getByTestId('login-return-to')).toHaveTextContent(
      '/workspaces/workspace-id/dashboard',
    );
  });

  it('conserve l’acceptation directe pour un utilisateur déjà connecté', async () => {
    const user = userEvent.setup();
    mocks.authStatus = 'authenticated';
    renderPage();

    await user.click(
      screen.getByRole('button', { name: 'Accepter l’invitation' }),
    );

    await waitFor(() => {
      expect(mocks.acceptExisting).toHaveBeenCalledWith(TOKEN);
    });
    expect(
      await screen.findByRole('heading', { name: 'Vous avez rejoint le workspace' }),
    ).toBeInTheDocument();
  });
});
