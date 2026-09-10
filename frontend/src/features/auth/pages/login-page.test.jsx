import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  getPlatformContext: vi.fn(),
}));

vi.mock('@/features/auth/api/auth-api', () => ({
  useLoginMutation: () => [mocks.login, { isLoading: false }],
}));

vi.mock('@/features/platform/api/platform-current-context-api', () => ({
  useLazyGetCurrentPlatformContextQuery: () => [mocks.getPlatformContext],
}));

import {
  clearCommercialInvitationTokenInMemory,
  setCommercialInvitationTokenInMemory,
} from '@/features/commercial-invitation/lib/commercial-invitation';
import { LoginPage } from '@/features/auth/pages/login-page';

const TOKEN = 'a'.repeat(64);

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage commercial invitation progress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCommercialInvitationTokenInMemory();
  });

  it('affiche l’étape 2 pendant la connexion issue d’une invitation', () => {
    setCommercialInvitationTokenInMemory(TOKEN);
    renderLogin();

    expect(
      screen.getByRole('navigation', { name: 'Activation de votre accès privé' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Étape 2 sur 3 — Connexion')).toBeInTheDocument();
    expect(screen.getByText(
      'Connectez-vous avec le compte correspondant à l’adresse ayant reçu l’invitation.',
    )).toBeInTheDocument();
  });

  it('ne pollue pas la connexion standard avec le stepper commercial', () => {
    renderLogin();

    expect(
      screen.queryByRole('navigation', { name: 'Activation de votre accès privé' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Accédez à votre espace SaaS Core.')).toBeInTheDocument();
  });
});
