import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';

const useListWorkspacesQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/workspace/api/workspace-api', () => ({
  useListWorkspacesQuery: useListWorkspacesQueryMock,
}));

import { WorkspaceSwitcher } from '@/features/workspace/components/workspace-switcher';

test('affiche un libellé statique lorsqu’un seul workspace est accessible', () => {
  const workspace = { id: 'workspace-1', name: 'Laetitia BALLAT' };
  useListWorkspacesQueryMock.mockReturnValue({ data: [workspace] });

  render(
    <MemoryRouter initialEntries={['/workspaces/workspace-1/dashboard']}>
      <Routes>
        <Route
          element={<WorkspaceSwitcher currentWorkspace={workspace} />}
          path="/workspaces/:workspaceId/dashboard"
        />
      </Routes>
    </MemoryRouter>,
  );

  expect(screen.getByText('Espace de travail :')).toBeInTheDocument();
  expect(screen.getByText('Laetitia BALLAT')).toBeInTheDocument();
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
});
