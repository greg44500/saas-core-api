import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { WorkspaceProvider } from '@/features/workspace/components/workspace-context';
import { WorkspacePermissionGate } from '@/features/workspace/components/workspace-permission-gate';

function renderGate({ allOf, anyOf, permission, permissions }) {
  render(
    <WorkspaceProvider
      membership={{ id: 'membership-1', role: { key: 'member', name: 'Membre' } }}
      permissions={permissions}
      workspace={{ id: 'workspace-1', name: 'Acme', status: 'active' }}
    >
      <WorkspacePermissionGate
        allOf={allOf}
        anyOf={anyOf}
        fallback={<span>Interdit</span>}
        permission={permission}
      >
        <span>Autorisé</span>
      </WorkspacePermissionGate>
    </WorkspaceProvider>,
  );
}

describe('WorkspacePermissionGate', () => {
  afterEach(() => {
    cleanup();
  });

  it('autorise une permission unique présente', () => {
    renderGate({
      permission: 'member:read',
      permissions: ['member:read'],
    });

    expect(screen.getByText('Autorisé')).toBeInTheDocument();
  });

  it('refuse une permission unique absente', () => {
    renderGate({
      permission: 'member:update',
      permissions: ['member:read'],
    });

    expect(screen.getByText('Interdit')).toBeInTheDocument();
  });

  it('supporte les règles anyOf et allOf', () => {
    const { unmount } = render(
      <WorkspaceProvider
        membership={{ id: 'membership-1', role: { key: 'member', name: 'Membre' } }}
        permissions={['member:read', 'file:read']}
        workspace={{ id: 'workspace-1', name: 'Acme', status: 'active' }}
      >
        <WorkspacePermissionGate anyOf={['member:update', 'file:read']}>
          <span>Any autorisé</span>
        </WorkspacePermissionGate>
        <WorkspacePermissionGate allOf={['member:read', 'file:read']}>
          <span>All autorisé</span>
        </WorkspacePermissionGate>
      </WorkspaceProvider>,
    );

    expect(screen.getByText('Any autorisé')).toBeInTheDocument();
    expect(screen.getByText('All autorisé')).toBeInTheDocument();
    unmount();
  });
});
