import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/audit-log/pages/workspace-audit-log-page', () => ({
  WorkspaceAuditLogPage: () => <div>Activity page allowed</div>,
}));

import { WorkspaceAuditLogRoute } from '@/features/audit-log/components/workspace-audit-log-route';
import { WorkspaceProvider } from '@/features/workspace/components/workspace-context';
import { WORKSPACE_FEATURE } from '@/features/workspace/constants/workspace-features';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';

const workspace = { id: 'workspace-1', name: 'Acme', status: 'active' };
const membership = { id: 'membership-1', role: { key: 'member', name: 'Membre' } };

function renderRoute(permissions, features = []) {
  return render(
    <WorkspaceProvider
      features={features}
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

  it('rend l’historique avec audit:read et audit_logs', () => {
    renderRoute(
      [WORKSPACE_PERMISSION.AUDIT_READ],
      [WORKSPACE_FEATURE.AUDIT_LOGS],
    );

    expect(screen.getByText('Activity page allowed')).toBeInTheDocument();
  });

  it('refuse commercialement la page lorsque audit_logs est absent', () => {
    renderRoute([WORKSPACE_PERMISSION.AUDIT_READ]);

    expect(
      screen.getByRole('heading', { name: 'Fonctionnalité indisponible' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Activity page allowed')).not.toBeInTheDocument();
  });

  it('refuse la page sans audit:read même si audit_logs est actif', () => {
    renderRoute(
      [WORKSPACE_PERMISSION.WORKSPACE_READ],
      [WORKSPACE_FEATURE.AUDIT_LOGS],
    );

    expect(screen.getByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Votre rôle ne permet pas de consulter l’historique d’activité de ce workspace.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Activity page allowed')).not.toBeInTheDocument();
  });
});
