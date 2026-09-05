import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

const useCloseCurrentAccountMutationMock = vi.hoisted(() => vi.fn());
const useLazyGetAccountClosureImpactQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/account/api/account-api', () => ({
  useCloseCurrentAccountMutation: useCloseCurrentAccountMutationMock,
  useLazyGetAccountClosureImpactQuery: useLazyGetAccountClosureImpactQueryMock,
}));

import { AccountClosureSection } from '@/features/account/components/account-closure-section';

const closureImpact = {
  workspacesToArchive: [
    {
      id: 'workspace-owned',
      name: 'Cabinet principal',
      otherActiveMemberCount: 2,
    },
  ],
  memberOnlyWorkspaces: [
    {
      id: 'workspace-member',
      name: 'Espace partenaire',
    },
  ],
  summary: {
    membershipRemovalCount: 2,
    workspaceArchiveCount: 1,
    otherActiveMemberCount: 2,
    affectedSubscriptionCount: 1,
  },
};

function renderSection() {
  const router = createMemoryRouter(
    [
      {
        path: '/security',
        element: <AccountClosureSection currentUserEmail="greg@example.com" />,
      },
      { path: '/login', element: <h1>Connexion cible</h1> },
    ],
    { initialEntries: ['/security'] },
  );

  render(<RouterProvider router={router} />);
  return router;
}

describe('AccountClosureSection', () => {
  const loadClosureImpactMock = vi.fn();
  const loadClosureImpactUnwrapMock = vi.fn();
  const closeCurrentAccountMock = vi.fn();
  const closeCurrentAccountUnwrapMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    loadClosureImpactUnwrapMock.mockResolvedValue(closureImpact);
    loadClosureImpactMock.mockReturnValue({
      unwrap: loadClosureImpactUnwrapMock,
    });
    useLazyGetAccountClosureImpactQueryMock.mockReturnValue([
      loadClosureImpactMock,
      {
        data: closureImpact,
        isFetching: false,
      },
    ]);

    closeCurrentAccountUnwrapMock.mockResolvedValue({ status: 'closed' });
    closeCurrentAccountMock.mockReturnValue({
      unwrap: closeCurrentAccountUnwrapMock,
    });
    useCloseCurrentAccountMutationMock.mockReturnValue([
      closeCurrentAccountMock,
      { isLoading: false },
    ]);
  });

  afterEach(() => cleanup());

  it('charge l’impact backend avant d’ouvrir la confirmation et affiche les conséquences', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole('button', { name: 'Fermer mon compte' }));

    expect(loadClosureImpactMock).toHaveBeenCalledWith(undefined, false);
    expect(await screen.findByRole('heading', { name: 'Confirmer la fermeture du compte' }))
      .toBeInTheDocument();
    expect(screen.getByText('Cabinet principal')).toBeInTheDocument();
    expect(screen.getByText('Espace partenaire')).toBeInTheDocument();
    expect(screen.getByText(/2 autre\(s\) membre\(s\) perdront l’accès/)).toBeInTheDocument();
  });

  it('refuse l’envoi tant que la confirmation explicite n’est pas cochée', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole('button', { name: 'Fermer mon compte' }));
    await user.type(screen.getByLabelText('Adresse email du compte'), 'greg@example.com');
    await user.type(screen.getByLabelText('Mot de passe actuel'), 'mot-de-passe-actuel-long');
    await user.click(screen.getByRole('button', { name: 'Fermer définitivement mon compte' }));

    expect(await screen.findByText('Vous devez confirmer explicitement la fermeture du compte.'))
      .toBeInTheDocument();
    expect(closeCurrentAccountMock).not.toHaveBeenCalled();
  });

  it('envoie uniquement le contrat de fermeture attendu puis quitte la session', async () => {
    const user = userEvent.setup();
    const router = renderSection();

    await user.click(screen.getByRole('button', { name: 'Fermer mon compte' }));
    await user.type(screen.getByLabelText('Adresse email du compte'), 'greg@example.com');
    await user.type(screen.getByLabelText('Mot de passe actuel'), 'mot-de-passe-actuel-long');
    await user.click(screen.getByLabelText(/Je comprends que cette fermeture/));
    await user.click(screen.getByRole('button', { name: 'Fermer définitivement mon compte' }));

    await waitFor(() => {
      expect(closeCurrentAccountMock).toHaveBeenCalledWith({
        currentPassword: 'mot-de-passe-actuel-long',
        confirmationEmail: 'greg@example.com',
        confirmAccountClosure: true,
      });
    });

    expect(await screen.findByRole('heading', { name: 'Connexion cible' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('n’ouvre pas la confirmation si l’impact ne peut pas être calculé', async () => {
    const user = userEvent.setup();
    loadClosureImpactUnwrapMock.mockRejectedValue({
      data: { message: 'Impact indisponible.' },
    });
    renderSection();

    await user.click(screen.getByRole('button', { name: 'Fermer mon compte' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Impact indisponible.');
    expect(screen.queryByRole('heading', { name: 'Confirmer la fermeture du compte' }))
      .not.toBeInTheDocument();
  });
});
