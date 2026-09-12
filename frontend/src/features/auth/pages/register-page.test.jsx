import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from 'react-router';

const PASSWORD_POLICY = {
  version: '2026-09-10',
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
    uniqueRatio: { minRatio: 0.6, points: 1 },
  },
  guidance: ['Une phrase de passe longue est recommandée.'],
};

const mocks = vi.hoisted(() => ({
  registerAccount: vi.fn(),
  registerAccountState: { isLoading: false },
  registerRecipient: vi.fn(),
  registerRecipientState: { isLoading: false },
}));

vi.mock('@/features/auth/api/auth-api', () => ({
  useGetPasswordPolicyQuery: () => ({ data: PASSWORD_POLICY }),
  useRegisterMutation: () => [
    mocks.registerAccount,
    mocks.registerAccountState,
  ],
}));

vi.mock(
  '@/features/commercial-invitation/api/commercial-invitations-api',
  () => ({
    useRegisterCommercialInvitationRecipientMutation: () => [
      mocks.registerRecipient,
      mocks.registerRecipientState,
    ],
  }),
);

import {
  clearCommercialInvitationTokenInMemory,
  setCommercialInvitationTokenInMemory,
} from '@/features/commercial-invitation/lib/commercial-invitation';
import { RegisterPage } from '@/features/auth/pages/register-page';

const TOKEN = 'a'.repeat(64);
const PASSWORD = 'A-very-long-password-123!';

function LocationProbe() {
  const location = useLocation();
  return <p>{location.pathname}</p>;
}

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route element={<RegisterPage />} path="/register" />
        <Route element={<LocationProbe />} path="/login" />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillRegistrationForm(user, email) {
  await user.type(screen.getByLabelText('Prénom'), 'Beta');
  await user.type(screen.getByLabelText('Nom'), 'User');
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Mot de passe'), PASSWORD);
  await user.type(screen.getByLabelText('Confirmer le mot de passe'), PASSWORD);
  await user.click(screen.getByRole('checkbox'));
}

describe('RegisterPage commercial invitation flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCommercialInvitationTokenInMemory();
    mocks.registerAccount.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    });
    mocks.registerRecipient.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    });
  });

  it('bloque la soumission tant que les documents contractuels ne sont pas acceptés', () => {
    renderRegister();

    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Créer mon compte' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Conditions générales d’utilisation' })).toHaveAttribute('href', '/legal/terms');
    expect(screen.getByRole('link', { name: 'Politique de confidentialité' })).toHaveAttribute('href', '/legal/privacy');
  });

  it('affiche la politique de mot de passe fournie par le backend', async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText('Mot de passe'), PASSWORD);

    expect(screen.getByText('15 à 128 caractères. Lettres, chiffres, espaces et caractères spéciaux sont autorisés.')).toBeInTheDocument();
    expect(screen.getByText(/Robustesse :/)).toBeInTheDocument();
  });

  it('utilise le endpoint lié à l’invitation et affiche l’étape 1', async () => {
    const user = userEvent.setup();
    setCommercialInvitationTokenInMemory(TOKEN);
    renderRegister();

    expect(
      screen.getByRole('navigation', { name: 'Activation de votre accès privé' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Étape 1 sur 3 — Création du compte')).toBeInTheDocument();

    await fillRegistrationForm(user, 'invitee@example.com');
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    await waitFor(() => {
      expect(mocks.registerRecipient).toHaveBeenCalledWith({
        firstName: 'Beta',
        lastName: 'User',
        email: 'invitee@example.com',
        password: PASSWORD,
        legalAccepted: true,
        token: TOKEN,
      });
    });
    expect(mocks.registerAccount).not.toHaveBeenCalled();
    expect(await screen.findByText('/login')).toBeInTheDocument();
  });

  it('affiche le refus backend d’un mauvais email sans basculer vers register générique', async () => {
    const user = userEvent.setup();
    setCommercialInvitationTokenInMemory(TOKEN);
    mocks.registerRecipient.mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        data: {
          message: 'Cette invitation est réservée à une autre adresse email',
        },
      }),
    });
    renderRegister();

    await fillRegistrationForm(user, 'wrong@example.com');
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cette invitation est réservée à une autre adresse email',
    );
    expect(mocks.registerAccount).not.toHaveBeenCalled();
  });

  it('conserve l’inscription Auth générique hors invitation sans stepper commercial', async () => {
    const user = userEvent.setup();
    renderRegister();

    expect(
      screen.queryByRole('navigation', { name: 'Activation de votre accès privé' }),
    ).not.toBeInTheDocument();

    await fillRegistrationForm(user, 'normal@example.com');
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    await waitFor(() => {
      expect(mocks.registerAccount).toHaveBeenCalledWith({
        firstName: 'Beta',
        lastName: 'User',
        email: 'normal@example.com',
        password: PASSWORD,
        legalAccepted: true,
      });
    });
    expect(mocks.registerRecipient).not.toHaveBeenCalled();
  });
});
