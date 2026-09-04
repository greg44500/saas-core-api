import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/workspace-roles/pages/workspace-roles-page', () => ({
  WorkspaceRolesPage: () => <h1>Rôles autorisés</h1>,
}));

import { WorkspaceProvider } from '@/features/workspace/components/workspace-context';
import { WORKSPACE_FEATURE } from '@/features/workspace/constants/workspace-features';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';
import { WorkspaceRolesRoute } from '@/features/workspace-roles/components/workspace-roles-route';

const workspace = { id: 'workspace-1', name: 'Acme', status: 'active' };
const membership = { id: 'membership-1', role: { key: 'admin', name: 'Administrateur' } };

function renderRoute(permissions, features = []) {
  render(
    <WorkspaceProvider
      features={features}
      membership={membership}
      permissions={permissions}
      workspace={workspace}
    >
      <WorkspaceRolesRoute />
    </WorkspaceProvider>,
  );
}

describe('WorkspaceRolesRoute', () => {
  afterEach(cleanup);

  it('refuse la surface Rôles lorsque team_management est absent', () => {
    renderRoute([
      WORKSPACE_PERMISSION.WORKSPACE_READ,
      WORKSPACE_PERMISSION.ROLE_READ,
    ]);

    expect(
      screen.getByRole('heading', { name: 'Fonctionnalité indisponible' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Rôles autorisés' })).not.toBeInTheDocument();
  });

  it('refuse la surface Rôles sans role:read même si la feature est active', () => {
    renderRoute(
      [WORKSPACE_PERMISSION.WORKSPACE_READ],
      [WORKSPACE_FEATURE.TEAM_MANAGEMENT],
    );

    expect(screen.getByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Rôles autorisés' })).not.toBeInTheDocument();
  });

  it('rend la page Rôles avec team_management et role:read', () => {
    renderRoute(
      [
        WORKSPACE_PERMISSION.WORKSPACE_READ,
        WORKSPACE_PERMISSION.ROLE_READ,
      ],
      [WORKSPACE_FEATURE.TEAM_MANAGEMENT],
    );

    expect(screen.getByRole('heading', { name: 'Rôles autorisés' })).toBeInTheDocument();
  });
});
