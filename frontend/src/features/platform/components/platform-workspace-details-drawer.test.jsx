import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PlatformWorkspaceDetailsDrawer } from '@/features/platform/components/platform-workspace-details-drawer';

const workspace = {
  id: '6a9ac1ae889a536cca199982',
  name: 'Workspace Laetitia BALLAT',
  status: 'active',
  statusReason: null,
  statusReasonDetails: null,
  statusChangedAt: '2026-09-04T13:03:00.000Z',
  statusChangedBy: {
    id: 'user-id',
    firstName: 'Laetitia',
    lastName: 'BALLAT',
    email: 'laetitia@test.com',
  },
  createdBy: {
    id: 'user-id',
    firstName: 'Laetitia',
    lastName: 'BALLAT',
    email: 'laetitia@test.com',
  },
  updatedBy: {
    id: 'user-id',
    firstName: 'Laetitia',
    lastName: 'BALLAT',
    email: 'laetitia@test.com',
  },
  createdAt: '2026-09-04T13:03:00.000Z',
  updatedAt: '2026-09-04T13:03:00.000Z',
};

describe('PlatformWorkspaceDetailsDrawer', () => {
  afterEach(() => cleanup());

  it('présente les informations administratives sans exposer l’identifiant technique', () => {
    render(
      <PlatformWorkspaceDetailsDrawer
        error={null}
        isLoading={false}
        onClose={vi.fn()}
        onRequestAction={vi.fn()}
        onRetry={vi.fn()}
        open
        workspace={workspace}
      />,
    );

    expect(
      screen.getByRole('dialog', { name: 'Workspace Laetitia BALLAT' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Statut')).toBeInTheDocument();
    expect(screen.getByText('Actif')).toBeInTheDocument();
    expect(screen.queryByText('Identifiant')).not.toBeInTheDocument();
    expect(screen.queryByText(workspace.id)).not.toBeInTheDocument();
  });
});
