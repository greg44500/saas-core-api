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
  registerAccount: vi.fn(),
  registerAccountState: { isLoading: false },
  registerRecipient: vi.fn(),
  registerRecipientState: { isLoading: false },
}));

vi.mock('@/features/auth/api/auth-api', () => ({
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

  it('utilise le endpoint lié à l’invitation quand le vault contient un token', async () => {
    const user = userEvent.setup();
    setCommercialInvitationTokenInMemory(TOKEN);
    renderRegister();

    await fillRegistrationForm(user, 'invitee@example.com');
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    await waitFor(() => {
      expect(mocks.registerRecipient).toHaveBeenCalledWith({
        firstName: 'Beta',
        lastName: 'User',
        email: 'invitee@example.com',
        password: PASSWORD,
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

  it('conserve l’inscription Auth générique hors invitation commerciale', async () => {
    const user = userEvent.setup();
    renderRegister();

    await fillRegistrationForm(user, 'normal@example.com');
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    await waitFor(() => {
      expect(mocks.registerAccount).toHaveBeenCalledWith({
        firstName: 'Beta',
        lastName: 'User',
        email: 'normal@example.com',
        password: PASSWORD,
      });
    });
    expect(mocks.registerRecipient).not.toHaveBeenCalled();
  });
});
