import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/subscription/pages/workspace-subscription-page', () => ({
  WorkspaceSubscriptionPage: () => <div>Subscription page allowed</div>,
}));

import { WorkspaceSubscriptionRoute } from '@/features/subscription/components/workspace-subscription-route';
import { WorkspaceProvider } from '@/features/workspace/components/workspace-context';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';

const workspace = { id: 'workspace-1', name: 'Acme', status: 'active' };
const membership = { id: 'membership-1', role: { key: 'admin', name: 'Administrateur' } };

function renderRoute(permissions) {
  return render(
    <WorkspaceProvider
      membership={membership}
      permissions={permissions}
      workspace={workspace}
    >
      <WorkspaceSubscriptionRoute />
    </WorkspaceProvider>,
  );
}

describe('WorkspaceSubscriptionRoute', () => {
  afterEach(() => {
    cleanup();
  });

  it('rend la page avec subscription:read', () => {
    renderRoute([WORKSPACE_PERMISSION.SUBSCRIPTION_READ]);

    expect(screen.getByText('Subscription page allowed')).toBeInTheDocument();
  });

  it('refuse la page sans subscription:read', () => {
    renderRoute([WORKSPACE_PERMISSION.WORKSPACE_READ]);

    expect(screen.getByRole('heading', { name: 'Abonnement' })).toBeInTheDocument();
    expect(
      screen.getByText('Vous n’avez pas la permission de consulter l’abonnement de ce workspace.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Subscription page allowed')).not.toBeInTheDocument();
  });
});
