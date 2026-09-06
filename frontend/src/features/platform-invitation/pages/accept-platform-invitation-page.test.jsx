import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from 'react-router';

const mocks = vi.hoisted(() => ({
  acceptExisting: vi.fn(),
  acceptNew: vi.fn(),
  authStatus: 'unauthenticated',
  getPlatformContext: vi.fn(),
}));

vi.mock('react-redux', () => ({
  useSelector: () => mocks.authStatus,
}));

vi.mock('@/features/platform-invitation/api/platform-invitation-acceptance-api', () => ({
  useAcceptExistingPlatformInvitationMutation: () => [
    mocks.acceptExisting,
    { isLoading: false },
  ],
  useAcceptNewPlatformInvitationMutation: () => [
    mocks.acceptNew,
    { isLoading: false },
  ],
}));

vi.mock('@/features/platform/api/platform-current-context-api', () => ({
  useLazyGetCurrentPlatformContextQuery: () => [mocks.getPlatformContext],
}));

vi.mock('@/features/platform/components/platform-sidebar', () => ({
  getVisiblePlatformNavigationSections: (permissions = []) => (
    permissions.includes('platform:users:read')
      ? [{ items: [{ to: '/platform/users' }] }]
      : []
  ),
}));

import { AcceptPlatformInvitationPage } from '@/features/platform-invitation/pages/accept-platform-invitation-page';

const TOKEN = 'a'.repeat(64);

function LoginTarget() {
  const location = useLocation();
  const from = location.state?.from;

  return (
    <div>
      Login cible
      {from && (
        <span data-testid="login-return-to">
          {`${from.pathname}${from.search ?? ''}`}
        </span>
      )}
      {location.state?.platformInvitationAccepted && (
        <span>Invitation acceptée</span>
      )}
    </div>
  );
}

function renderPage(path = `/platform-invitations/accept?token=${TOKEN}`) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/platform-invitations/accept"
          element={<AcceptPlatformInvitationPage />}
        />
        <Route path="/login" element={<LoginTarget />} />
        <Route path="/platform/users" element={<h1>Utilisateurs</h1>} />
        <Route path="/account/profile" element={<h1>Profil</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AcceptPlatformInvitationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authStatus = 'unauthenticated';
    mocks.acceptNew.mockImplementation(() => ({
      unwrap: vi.fn().mockResolvedValue({
        user: { id: 'user-id' },
        membership: { id: 'membership-id' },
      }),
    }));
    mocks.acceptExisting.mockImplementation(() => ({
      unwrap: vi.fn().mockResolvedValue({ id: 'membership-id' }),
    }));
    mocks.getPlatformContext.mockImplementation(() => ({
      unwrap: vi.fn().mockResolvedValue({
        status: 'active',
        permissions: ['platform:users:read'],
      }),
    }));
  });

  afterEach(() => cleanup());

  it('refuse localement un token mal formé sans appeler le backend', () => {
    renderPage('/platform-invitations/accept?token=invalide');

    expect(
      screen.getByRole('heading', { name: 'Ce lien n’est pas utilisable' }),
    ).toBeInTheDocument();
    expect(mocks.acceptExisting).not.toHaveBeenCalled();
    expect(mocks.acceptNew).not.toHaveBeenCalled();
  });

  it('crée un nouveau compte avec uniquement un mot de passe puis renvoie vers le login', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Prénom')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Nom')).not.toBeInTheDocument();

    await user.type(
      screen.getByLabelText('Mot de passe'),
      'mot-de-passe-tres-securise',
    );
    await user.type(
      screen.getByLabelText('Confirmer le mot de passe'),
      'mot-de-passe-tres-securise',
    );
    await user.click(screen.getByRole('button', { name: 'Créer mon accès' }));

    await waitFor(() => {
      expect(mocks.acceptNew).toHaveBeenCalledWith({
        token: TOKEN,
        password: 'mot-de-passe-tres-securise',
      });
    });
    expect(await screen.findByText('Invitation acceptée')).toBeInTheDocument();
  });

  it('préserve le lien complet lorsqu’un destinataire existant doit se connecter', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      screen.getByRole('link', { name: 'Se connecter pour accepter' }),
    );

    expect(screen.getByText('Login cible')).toBeInTheDocument();
    expect(screen.getByTestId('login-return-to')).toHaveTextContent(
      `/platform-invitations/accept?token=${TOKEN}`,
    );
  });

  it('accepte avec le compte connecté puis ouvre la première destination autorisée', async () => {
    const user = userEvent.setup();
    mocks.authStatus = 'authenticated';
    renderPage();

    await user.click(
      screen.getByRole('button', { name: 'Accepter l’invitation' }),
    );

    await waitFor(() => {
      expect(mocks.acceptExisting).toHaveBeenCalledWith(TOKEN);
      expect(mocks.getPlatformContext).toHaveBeenCalled();
    });
    expect(
      await screen.findByRole('heading', { name: 'Utilisateurs' }),
    ).toBeInTheDocument();
  });
});
