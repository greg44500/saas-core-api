import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

import { WorkspaceProvider } from '@/features/workspace/components/workspace-context';
import { WorkspaceSidebar } from '@/features/workspace/components/workspace-sidebar';
import { WORKSPACE_FEATURE } from '@/features/workspace/constants/workspace-features';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';
import { coreWorkspaceNavigation } from '@/features/workspace/navigation/core-workspace-navigation';

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

function renderSidebar(
  permissions,
  {
    collapsed = false,
    features = [],
    initialEntry = '/workspaces/workspace-1/dashboard',
  } = {},
) {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <WorkspaceProvider
        features={features}
        membership={membership}
        permissions={permissions}
        workspace={workspace}
      >
        <WorkspaceSidebar
          collapsed={collapsed}
          navigation={coreWorkspaceNavigation}
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

  it('ne conserve que le dashboard quand aucun groupe ne contient d’entrée autorisée', () => {
    renderSidebar([WORKSPACE_PERMISSION.WORKSPACE_READ]);

    expect(screen.getByText('Tableau de bord')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fonctionnalités' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Gestion du workspace' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Compte & offre' })).not.toBeInTheDocument();
  });

  it('masque la gestion d’équipe quand la permission existe mais pas la feature', () => {
    renderSidebar([
      WORKSPACE_PERMISSION.WORKSPACE_READ,
      WORKSPACE_PERMISSION.MEMBER_READ,
      WORKSPACE_PERMISSION.ROLE_READ,
    ]);

    expect(screen.queryByRole('button', { name: 'Gestion du workspace' })).not.toBeInTheDocument();
    expect(screen.queryByText('Membres')).not.toBeInTheDocument();
  });

  it('affiche les sous-options autorisées au clic sur leur groupe', async () => {
    const user = userEvent.setup();

    renderSidebar(
      [
        WORKSPACE_PERMISSION.WORKSPACE_READ,
        WORKSPACE_PERMISSION.MEMBER_READ,
        WORKSPACE_PERMISSION.SUBSCRIPTION_READ,
      ],
      { features: [WORKSPACE_FEATURE.TEAM_MANAGEMENT] },
    );

    await user.click(screen.getByRole('button', { name: 'Gestion du workspace' }));
    expect(screen.getByRole('link', { name: 'Membres' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Compte & offre' }));
    expect(screen.getByRole('link', { name: 'Abonnement' })).toBeInTheDocument();
  });

  it('rend Fichiers consultable avec file:read même si file_upload est absent', async () => {
    const user = userEvent.setup();

    renderSidebar([
      WORKSPACE_PERMISSION.WORKSPACE_READ,
      WORKSPACE_PERMISSION.FILE_READ,
    ]);

    await user.click(screen.getByRole('button', { name: 'Fonctionnalités' }));
    const filesLink = screen.getByRole('link', { name: 'Fichiers' });

    expect(filesLink).toHaveAttribute('href', '/workspaces/workspace-1/files');
  });

  it('ouvre automatiquement le groupe contenant la route courante', () => {
    renderSidebar(
      [
        WORKSPACE_PERMISSION.WORKSPACE_READ,
        WORKSPACE_PERMISSION.AUDIT_READ,
      ],
      {
        features: [WORKSPACE_FEATURE.AUDIT_LOGS],
        initialEntry: '/workspaces/workspace-1/activity',
      },
    );

    expect(screen.getByRole('button', { name: 'Compte & offre' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Activité' })).toBeInTheDocument();
  });

  it('masque Activité avec audit:read lorsque audit_logs est absent', () => {
    renderSidebar([
      WORKSPACE_PERMISSION.WORKSPACE_READ,
      WORKSPACE_PERMISSION.AUDIT_READ,
    ]);

    expect(screen.queryByText('Activité')).not.toBeInTheDocument();
  });

  it('rend Paramètres dans Gestion du workspace avec workspace:update', async () => {
    const user = userEvent.setup();

    renderSidebar([
      WORKSPACE_PERMISSION.WORKSPACE_READ,
      WORKSPACE_PERMISSION.WORKSPACE_UPDATE,
    ]);

    await user.click(screen.getByRole('button', { name: 'Gestion du workspace' }));
    const settingsLink = screen.getByRole('link', { name: 'Paramètres' });

    expect(settingsLink).toHaveAttribute('href', '/workspaces/workspace-1/settings');
  });

  it('ouvre un flyout explicite pour un groupe en mode réduit', async () => {
    const user = userEvent.setup();

    renderSidebar(
      [
        WORKSPACE_PERMISSION.WORKSPACE_READ,
        WORKSPACE_PERMISSION.MEMBER_READ,
      ],
      {
        collapsed: true,
        features: [WORKSPACE_FEATURE.TEAM_MANAGEMENT],
      },
    );

    expect(
      screen.getByRole('link', { name: 'Tableau de bord' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Tableau de bord', { selector: '[role="tooltip"]' })).toBeInTheDocument();
    expect(screen.getByText('Gestion du workspace', { selector: '[role="tooltip"]' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Gestion du workspace' }));
    expect(screen.getByRole('link', { name: 'Membres' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Déployer la navigation' }),
    ).toBeInTheDocument();
  });
});
