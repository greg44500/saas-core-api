import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

const useArchiveWorkspaceMutationMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/workspace/api/workspace-api', () => ({
  useArchiveWorkspaceMutation: useArchiveWorkspaceMutationMock,
}));

import { WorkspaceArchiveSection } from '@/features/workspace/components/workspace-archive-section';

const workspace = {
  id: '507f1f77bcf86cd799439011',
  name: 'Workspace Démo',
};

function renderArchiveSection() {
  const router = createMemoryRouter(
    [
      {
        path: '/workspaces/:workspaceId/settings',
        element: <WorkspaceArchiveSection workspace={workspace} />,
      },
      {
        path: '/workspaces',
        element: <h1>Liste des workspaces</h1>,
      },
    ],
    {
      initialEntries: [`/workspaces/${workspace.id}/settings`],
    },
  );

  render(<RouterProvider router={router} />);
  return router;
}

describe('WorkspaceArchiveSection', () => {
  const archiveWorkspaceMock = vi.fn();
  const archiveWorkspaceUnwrapMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    archiveWorkspaceUnwrapMock.mockResolvedValue({
      id: workspace.id,
      status: 'archived',
    });
    archiveWorkspaceMock.mockReturnValue({
      unwrap: archiveWorkspaceUnwrapMock,
    });
    useArchiveWorkspaceMutationMock.mockReturnValue([
      archiveWorkspaceMock,
      { isLoading: false },
    ]);
  });

  afterEach(() => cleanup());

  it('demande le nom exact et le mot de passe avant tout archivage', async () => {
    const user = userEvent.setup();
    renderArchiveSection();

    await user.click(screen.getByRole('button', { name: 'Archiver ce workspace' }));

    expect(
      screen.getByRole('heading', { name: 'Confirmer l’archivage du workspace' }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText('Nom du workspace'), 'Autre workspace');
    await user.type(screen.getByLabelText('Mot de passe actuel'), 'mot-de-passe-actuel-long');
    await user.click(
      screen.getByRole('button', { name: 'Archiver définitivement ce workspace' }),
    );

    expect(archiveWorkspaceMock).not.toHaveBeenCalled();
    expect(
      await screen.findByText('Saisissez exactement le nom du workspace pour confirmer.'),
    ).toBeInTheDocument();
  });

  it('envoie uniquement le contrat attendu puis revient à la sélection des workspaces', async () => {
    const user = userEvent.setup();
    const router = renderArchiveSection();

    await user.click(screen.getByRole('button', { name: 'Archiver ce workspace' }));
    await user.type(screen.getByLabelText('Nom du workspace'), workspace.name);
    await user.type(screen.getByLabelText('Mot de passe actuel'), 'mot-de-passe-actuel-long');
    await user.click(
      screen.getByRole('button', { name: 'Archiver définitivement ce workspace' }),
    );

    await waitFor(() => {
      expect(archiveWorkspaceMock).toHaveBeenCalledWith({
        workspaceId: workspace.id,
        currentPassword: 'mot-de-passe-actuel-long',
        confirmationName: workspace.name,
      });
    });

    expect(await screen.findByRole('heading', { name: 'Liste des workspaces' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/workspaces');
  });

  it('reste sur le workflow et affiche l’erreur si le backend refuse l’archivage', async () => {
    const user = userEvent.setup();
    archiveWorkspaceUnwrapMock.mockRejectedValue({
      data: { message: 'Le nom de confirmation du workspace est incorrect' },
    });
    const router = renderArchiveSection();

    await user.click(screen.getByRole('button', { name: 'Archiver ce workspace' }));
    await user.type(screen.getByLabelText('Nom du workspace'), workspace.name);
    await user.type(screen.getByLabelText('Mot de passe actuel'), 'mot-de-passe-actuel-long');
    await user.click(
      screen.getByRole('button', { name: 'Archiver définitivement ce workspace' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Le nom de confirmation du workspace est incorrect',
    );
    expect(router.state.location.pathname).toBe(`/workspaces/${workspace.id}/settings`);
  });
});
