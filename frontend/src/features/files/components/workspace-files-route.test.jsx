import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/files/pages/workspace-files-page', () => ({
  WorkspaceFilesPage: () => <div>Files page allowed</div>,
}));

import { WorkspaceFilesRoute } from '@/features/files/components/workspace-files-route';
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
      <WorkspaceFilesRoute />
    </WorkspaceProvider>,
  );
}

describe('WorkspaceFilesRoute', () => {
  afterEach(() => {
    cleanup();
  });

  it('rend la page avec file:read', () => {
    renderRoute([WORKSPACE_PERMISSION.FILE_READ]);

    expect(screen.getByText('Files page allowed')).toBeInTheDocument();
  });

  it('refuse la page sans file:read', () => {
    renderRoute([WORKSPACE_PERMISSION.WORKSPACE_READ]);

    expect(screen.getByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument();
    expect(
      screen.getByText('Votre rôle ne permet pas de consulter les fichiers de ce workspace.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Files page allowed')).not.toBeInTheDocument();
  });
});
