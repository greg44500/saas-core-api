import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

import { WorkspaceProvider } from '@/features/workspace/components/workspace-context';
import { WorkspaceSidebar } from '@/features/workspace/components/workspace-sidebar';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';

const workspace = {
  id: 'workspace-1',
  name: 'Acme',
  status: 'active',
};

const membership = {
  id: 'membership-1',
  role: {
    key: 'member',
    name: 'Membre',
  },
};

function renderSidebar(permissions, { collapsed = false } = {}) {
  render(
    <MemoryRouter initialEntries={['/workspaces/workspace-1/dashboard']}>
      <WorkspaceProvider
        membership={membership}
        permissions={permissions}
        workspace={workspace}
      >
        <WorkspaceSidebar
          collapsed={collapsed}
          onToggle={vi.fn()}
          workspace={workspace}
        />
      </WorkspaceProvider>
    </MemoryRouter>,
  );
}

describe('WorkspaceSidebar', () => {
  afterEach(() => {
    cleanup();
  });

  it('masque entièrement Administration sans permission associée', () => {
    renderSidebar([WORKSPACE_PERMISSION.WORKSPACE_READ]);

    expect(screen.getByText('Tableau de bord')).toBeInTheDocument();
    expect(screen.queryByText('Administration')).not.toBeInTheDocument();
    expect(screen.queryByText('Membres')).not.toBeInTheDocument();
    expect(screen.queryByText('Fichiers')).not.toBeInTheDocument();
    expect(screen.queryByText('Abonnement')).not.toBeInTheDocument();
    expect(screen.queryByText('Paramètres')).not.toBeInTheDocument();
  });

  it('affiche uniquement les entrées autorisées par les permissions effectives', () => {
    renderSidebar([
      WORKSPACE_PERMISSION.WORKSPACE_READ,
      WORKSPACE_PERMISSION.MEMBER_READ,
      WORKSPACE_PERMISSION.SUBSCRIPTION_READ,
    ]);

    expect(screen.getByText('Administration')).toBeInTheDocument();
    expect(screen.getByText('Membres')).toBeInTheDocument();
    expect(screen.getByText('Abonnement')).toBeInTheDocument();
    expect(screen.queryByText('Fichiers')).not.toBeInTheDocument();
    expect(screen.queryByText('Paramètres')).not.toBeInTheDocument();
  });

  it('conserve des libellés accessibles et expose des tooltips en mode réduit', () => {
    renderSidebar(
      [
        WORKSPACE_PERMISSION.WORKSPACE_READ,
        WORKSPACE_PERMISSION.MEMBER_READ,
      ],
      { collapsed: true },
    );

    expect(
      screen.getByRole('link', { name: 'Tableau de bord' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Tableau de bord', { selector: '[role="tooltip"]' })).toBeInTheDocument();
    expect(screen.getByText('Membres', { selector: '[role="tooltip"]' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Déployer la navigation' }),
    ).toBeInTheDocument();
  });
});
