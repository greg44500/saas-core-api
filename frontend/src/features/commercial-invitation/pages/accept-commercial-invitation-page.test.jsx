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
    usePreviewCommercialInvitationMutation: () => [
      mocks.preview,
      mocks.previewState,
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
    mocks.acceptState = {
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
    mocks.logout.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('prévisualise l’offre avec le token conservé uniquement en runtime', async () => {
    renderAcceptance();

    expect(
      screen.getByRole('heading', { name: 'Découverte privée' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Beta Workspace/)).toBeInTheDocument();

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

  it('permet de changer de compte sans persister ni perdre le secret runtime', async () => {
    const user = userEvent.setup();
    mocks.authStatus = 'authenticated';
    renderAcceptance();

    await user.click(
      screen.getByRole('button', { name: 'Utiliser un autre compte' }),
    );

    await waitFor(() => {
      expect(mocks.logout).toHaveBeenCalledOnce();
    });
    expect(await screen.findByText('/login|none')).toBeInTheDocument();
    expect(getCommercialInvitationTokenFromLocation()).toBe(TOKEN);
  });

  it('accepte avec une session authentifiée, efface le secret puis ouvre le workspace', async () => {
    const user = userEvent.setup();
    mocks.authStatus = 'authenticated';
    renderAcceptance();

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
});
