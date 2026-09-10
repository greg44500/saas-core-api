import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from 'react-router';

const mocks = vi.hoisted(() => ({
  accept: vi.fn(),
  acceptState: {
    error: null,
    isLoading: false,
  },
  authStatus: 'unauthenticated',
  decline: vi.fn(),
  declineState: {
    error: null,
    isLoading: false,
  },
  logout: vi.fn(),
  logoutState: {
    isLoading: false,
  },
  preview: vi.fn(),
  previewState: {
    data: null,
    error: null,
    isLoading: false,
  },
  verifyRecipient: vi.fn(),
  recipientState: {
    data: null,
    error: null,
    isLoading: false,
  },
}));

vi.mock('react-redux', () => ({
  useSelector: vi.fn(() => mocks.authStatus),
}));

vi.mock('@/features/auth/api/auth-api', () => ({
  useLogoutMutation: () => [mocks.logout, mocks.logoutState],
}));

vi.mock(
  '@/features/commercial-invitation/api/commercial-invitations-api',
  () => ({
    useAcceptCommercialInvitationMutation: () => [
      mocks.accept,
      mocks.acceptState,
    ],
    useDeclineCommercialInvitationMutation: () => [
      mocks.decline,
      mocks.declineState,
    ],
    usePreviewCommercialInvitationMutation: () => [
      mocks.preview,
      mocks.previewState,
    ],
    useVerifyCommercialInvitationRecipientMutation: () => [
      mocks.verifyRecipient,
      mocks.recipientState,
    ],
  }),
);

import {
  clearCommercialInvitationTokenInMemory,
  getCommercialInvitationTokenFromLocation,
  setCommercialInvitationTokenInMemory,
} from '@/features/commercial-invitation/lib/commercial-invitation';
import { AcceptCommercialInvitationPage } from '@/features/commercial-invitation/pages/accept-commercial-invitation-page';

const TOKEN = 'a'.repeat(64);
const invitation = {
  workspaceName: 'Beta Workspace',
  expiresAt: '2026-09-15T12:00:00.000Z',
  offer: {
    planName: 'Découverte privée',
    currency: 'EUR',
    billingInterval: 'none',
    priceExclTaxMinor: 0,
    trialEnabled: false,
    trialDurationDays: null,
    features: ['file_upload'],
    limits: { members: 3 },
  },
};

function LocationStateProbe() {
  const location = useLocation();

  return (
    <p>
      {location.pathname}|{location.state?.commercialInvitationToken ?? 'none'}
    </p>
  );
}

function renderAcceptance() {
  return render(
    <MemoryRouter initialEntries={['/commercial-invitations/accept']}>
      <Routes>
        <Route
          element={<AcceptCommercialInvitationPage />}
          path="/commercial-invitations/accept"
        />
        <Route element={<LocationStateProbe />} path="/login" />
        <Route element={<LocationStateProbe />} path="/register" />
        <Route element={<LocationStateProbe />} path="/" />
        <Route
          element={<LocationStateProbe />}
          path="/workspaces/:workspaceId/dashboard"
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AcceptCommercialInvitationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCommercialInvitationTokenInMemory();
    setCommercialInvitationTokenInMemory(TOKEN);
    window.history.replaceState({}, '', '/');
    mocks.authStatus = 'unauthenticated';
    mocks.previewState = {
      data: invitation,
      error: null,
      isLoading: false,
    };
    mocks.recipientState = {
      data: null,
      error: null,
      isLoading: false,
    };
    mocks.acceptState = {
      error: null,
      isLoading: false,
    };
    mocks.declineState = {
      error: null,
      isLoading: false,
    };
    mocks.logoutState = {
      isLoading: false,
    };
    mocks.accept.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        workspace: { id: 'workspace-123' },
      }),
    });
    mocks.decline.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ status: 'declined' }),
    });
    mocks.logout.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('prévisualise l’offre en étape 1 avec le token conservé uniquement en runtime', async () => {
    renderAcceptance();

    expect(
      screen.getByRole('heading', { name: 'Découverte privée' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Beta Workspace/)).toBeInTheDocument();
    expect(screen.getByText('Étape 1 sur 3 — Création du compte')).toBeInTheDocument();

    await waitFor(() => {
      expect(mocks.preview).toHaveBeenCalledWith(TOKEN);
    });
    expect(window.location.hash).toBe('');
    expect(getCommercialInvitationTokenFromLocation()).toBe(TOKEN);
  });

  it('n’insère pas le token dans history.state lors du passage vers Login', async () => {
    const user = userEvent.setup();
    renderAcceptance();

    await user.click(screen.getByRole('link', { name: 'J’ai déjà un compte' }));

    expect(await screen.findByText('/login|none')).toBeInTheDocument();
    expect(getCommercialInvitationTokenFromLocation()).toBe(TOKEN);
  });

  it('reste en étape 2 avec le mauvais compte et propose uniquement le changement de compte', async () => {
    const user = userEvent.setup();
    mocks.authStatus = 'authenticated';
    mocks.recipientState = {
      data: null,
      error: { status: 403 },
      isLoading: false,
    };

    renderAcceptance();

    await waitFor(() => {
      expect(mocks.verifyRecipient).toHaveBeenCalledWith(TOKEN);
    });
    expect(screen.getByText('Étape 2 sur 3 — Connexion')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Accepter et créer mon espace' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Refuser l’offre' }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Utiliser un autre compte' }),
    );

    await waitFor(() => {
      expect(mocks.logout).toHaveBeenCalledOnce();
    });
    expect(await screen.findByText('/login|none')).toBeInTheDocument();
    expect(getCommercialInvitationTokenFromLocation()).toBe(TOKEN);
  });

  it('passe en étape 3 uniquement après vérification du bénéficiaire', async () => {
    const user = userEvent.setup();
    mocks.authStatus = 'authenticated';
    mocks.recipientState = {
      data: { matchesRecipient: true },
      error: null,
      isLoading: false,
    };

    renderAcceptance();

    expect(
      screen.getByText('Étape 3 sur 3 — Acceptation de l’offre'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Utiliser un autre compte' }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Accepter et créer mon espace' }),
    );

    await waitFor(() => {
      expect(mocks.accept).toHaveBeenCalledWith(TOKEN);
    });
    expect(
      await screen.findByText('/workspaces/workspace-123/dashboard|none'),
    ).toBeInTheDocument();
    expect(getCommercialInvitationTokenFromLocation()).toBeNull();
  });

  it('refuse définitivement l’offre, invalide le secret runtime et déconnecte la session courante', async () => {
    const user = userEvent.setup();
    mocks.authStatus = 'authenticated';
    mocks.recipientState = {
      data: { matchesRecipient: true },
      error: null,
      isLoading: false,
    };

    renderAcceptance();

    await user.click(screen.getByRole('button', { name: 'Refuser l’offre' }));
    await user.click(
      screen.getByRole('button', { name: 'Refuser définitivement' }),
    );

    await waitFor(() => {
      expect(mocks.decline).toHaveBeenCalledWith(TOKEN);
      expect(mocks.logout).toHaveBeenCalledOnce();
    });
    expect(await screen.findByText('/|none')).toBeInTheDocument();
    expect(getCommercialInvitationTokenFromLocation()).toBeNull();
  });
});
