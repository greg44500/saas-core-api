import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/workspace-members/pages/workspace-members-page', () => ({
  WorkspaceMembersPage: () => <h1>Gestion autorisée</h1>,
}));

import { WorkspaceProvider } from '@/features/workspace/components/workspace-context';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';
import { WorkspaceMembersRoute } from '@/features/workspace-members/components/workspace-members-route';

const workspace = { id: 'workspace-1', name: 'Acme', status: 'active' };
const membership = { id: 'membership-1', role: { key: 'reader', name: 'Lecteur' } };

function renderRoute(permissions) {
  render(
    <WorkspaceProvider workspace={workspace} membership={membership} permissions={permissions}>
      <WorkspaceMembersRoute />
    </WorkspaceProvider>,
  );
}

describe('WorkspaceMembersRoute', () => {
  afterEach(cleanup);

  it('refuse la surface Membres sans member:read', () => {
    renderRoute([WORKSPACE_PERMISSION.WORKSPACE_READ]);

    expect(screen.getByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Gestion autorisée' })).not.toBeInTheDocument();
  });

  it('rend la page Membres avec member:read', () => {
    renderRoute([
      WORKSPACE_PERMISSION.WORKSPACE_READ,
      WORKSPACE_PERMISSION.MEMBER_READ,
    ]);

    expect(screen.getByRole('heading', { name: 'Gestion autorisée' })).toBeInTheDocument();
  });
});
