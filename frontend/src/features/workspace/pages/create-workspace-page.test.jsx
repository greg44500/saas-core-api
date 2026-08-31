import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

const useListWorkspacesQueryMock = vi.hoisted(() => vi.fn());
const useCreateWorkspaceMutationMock = vi.hoisted(() => vi.fn());
const createWorkspaceMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/workspace/api/workspace-api', () => ({
  useListWorkspacesQuery: useListWorkspacesQueryMock,
  useCreateWorkspaceMutation: useCreateWorkspaceMutationMock,
}));

import { CreateWorkspacePage } from '@/features/workspace/pages/create-workspace-page';

function renderPage() {
  const router = createMemoryRouter(
    [
      { path: '/onboarding/workspace', Component: CreateWorkspacePage },
      { path: '/workspaces/:workspaceId/dashboard', Component: () => <h1>Dashboard cible</h1> },
      { path: '/onboarding/plans/:workspaceId', Component: () => <h1>Plans cible</h1> },
      { path: '/workspaces', Component: () => <h1>Workspaces cible</h1> },
    ],
    { initialEntries: ['/onboarding/workspace'] },
  );

  render(<RouterProvider router={router} />);
  return router;
}

describe('CreateWorkspacePage', () => {
  beforeEach(() => {
    useListWorkspacesQueryMock.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    createWorkspaceMock.mockReset();
    useCreateWorkspaceMutationMock.mockReturnValue([
      createWorkspaceMock,
      { isLoading: false },
    ]);
  });

  afterEach(() => {
    cleanup();
  });

  it('crée le workspace avec le nom normalisé puis confirme Free', async () => {
    const user = userEvent.setup();
    createWorkspaceMock.mockReturnValue({
      unwrap: () => Promise.resolve({ id: 'workspace-1', name: 'Acme' }),
    });

    renderPage();

    await user.type(screen.getByLabelText('Nom du workspace'), '  Acme  ');
    await user.click(screen.getByRole('button', { name: 'Créer mon espace' }));

    expect(createWorkspaceMock).toHaveBeenCalledWith({ name: 'Acme' });
    expect(await screen.findByRole('heading', { name: 'Acme est prêt' })).toBeInTheDocument();
    expect(screen.getByText('Plan actuel : Free')).toBeInTheDocument();
    expect(screen.getByText('Aucun trial n’a été démarré automatiquement.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Accéder à mon espace' })).toHaveAttribute(
      'href',
      '/workspaces/workspace-1/dashboard',
    );
    expect(screen.getByRole('link', { name: 'Comparer les plans' })).toHaveAttribute(
      'href',
      '/onboarding/plans/workspace-1',
    );
  });

  it('refuse un nom trop court avant l’appel API', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('Nom du workspace'), 'a');
    await user.click(screen.getByRole('button', { name: 'Créer mon espace' }));

    expect(await screen.findByText('Le nom doit contenir au moins 2 caractères.')).toBeInTheDocument();
    expect(createWorkspaceMock).not.toHaveBeenCalled();
  });
});
