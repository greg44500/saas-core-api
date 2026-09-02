import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/audit-log/pages/workspace-audit-log-page', () => ({
  WorkspaceAuditLogPage: () => <div>Activity page allowed</div>,
}));

import { WorkspaceAuditLogRoute } from '@/features/audit-log/components/workspace-audit-log-route';
import { WorkspaceProvider } from '@/features/workspace/components/workspace-context';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';

const workspace = { id: 'workspace-1', name: 'Acme', status: 'active' };
const membership = { id: 'membership-1', role: { key: 'member', name: 'Membre' } };

function renderRoute(permissions) {
  return render(
    <WorkspaceProvider
      membership={membership}
      permissions={permissions}
      workspace={workspace}
    >
      <WorkspaceAuditLogRoute />
    </WorkspaceProvider>,
  );
}

describe('WorkspaceAuditLogRoute', () => {
  afterEach(() => {
    cleanup();
  });

  it('rend l’historique avec audit:read', () => {
    renderRoute([WORKSPACE_PERMISSION.AUDIT_READ]);

    expect(screen.getByText('Activity page allowed')).toBeInTheDocument();
  });

  it('refuse la page sans audit:read', () => {
    renderRoute([WORKSPACE_PERMISSION.WORKSPACE_READ]);

    expect(screen.getByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Votre rôle ne permet pas de consulter l’historique d’activité de ce workspace.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Activity page allowed')).not.toBeInTheDocument();
  });
});
