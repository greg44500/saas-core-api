import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

const useListWorkspacesQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/workspace/api/workspace-api', () => ({
  useListWorkspacesQuery: useListWorkspacesQueryMock,
}));

import { WorkspaceSwitcher } from '@/features/workspace/components/workspace-switcher';

function renderSwitcher() {
  const router = createMemoryRouter(
    [
      {
        path: '/workspaces/:workspaceId/dashboard',
        Component: WorkspaceSwitcher,
      },
    ],
    { initialEntries: ['/workspaces/workspace-1/dashboard'] },
  );

  render(<RouterProvider router={router} />);
  return router;
}

describe('WorkspaceSwitcher', () => {
  beforeEach(() => {
    useListWorkspacesQueryMock.mockReset();
    useListWorkspacesQueryMock.mockReturnValue({
      data: [
        { id: 'workspace-1', name: 'Acme' },
        { id: 'workspace-2', name: 'Beta' },
      ],
      isLoading: false,
      isFetching: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('reflète le workspace courant depuis l URL', () => {
    renderSwitcher();

    expect(screen.getByRole('combobox', { name: 'Espace de travail actif' })).toHaveValue(
      'workspace-1',
    );
  });

  it('navigue vers le dashboard du workspace sélectionné', async () => {
    const router = renderSwitcher();

    fireEvent.change(screen.getByRole('combobox', { name: 'Espace de travail actif' }), {
      target: { value: 'workspace-2' },
    });

    expect(router.state.location.pathname).toBe('/workspaces/workspace-2/dashboard');
  });
});
