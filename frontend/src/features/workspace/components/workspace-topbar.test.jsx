import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useWorkspaceContextMock = vi.hoisted(() => vi.fn());
const useGetWorkspaceSubscriptionQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: useWorkspaceContextMock,
}));
vi.mock('@/features/subscription/api/subscription-api', () => ({
  useGetWorkspaceSubscriptionQuery: useGetWorkspaceSubscriptionQueryMock,
}));
vi.mock('@/features/workspace/components/workspace-switcher', () => ({
  WorkspaceSwitcher: ({ currentWorkspace }) => (
    <span>Espace de travail : {currentWorkspace.name}</span>
  ),
}));
vi.mock('@/features/workspace/components/workspace-user-identity', () => ({
  WorkspaceUserIdentity: ({ planName }) => (
    <span>{planName ? `Plan ${planName}` : 'Identité utilisateur'}</span>
  ),
}));

import { WorkspaceTopbar } from '@/features/workspace/components/workspace-topbar';

describe('WorkspaceTopbar', () => {
  const workspace = { id: 'workspace-1', name: 'Acme' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('affiche le plan effectif uniquement avec subscription:read', () => {
    useWorkspaceContextMock.mockReturnValue({ can: () => true });
    useGetWorkspaceSubscriptionQueryMock.mockReturnValue({
      data: {
        effectiveEntitlement: {
          plan: { name: 'Free' },
        },
      },
    });

    render(<WorkspaceTopbar workspace={workspace} />);

    expect(useGetWorkspaceSubscriptionQueryMock).toHaveBeenCalledWith(
      'workspace-1',
      { skip: false },
    );
    expect(screen.getByText('Plan Free')).toBeInTheDocument();
  });

  it('skip la lecture commerciale lorsque la permission manque', () => {
    useWorkspaceContextMock.mockReturnValue({ can: () => false });
    useGetWorkspaceSubscriptionQueryMock.mockReturnValue({ data: undefined });

    render(<WorkspaceTopbar workspace={workspace} />);

    expect(useGetWorkspaceSubscriptionQueryMock).toHaveBeenCalledWith(
      'workspace-1',
      { skip: true },
    );
    expect(screen.queryByText(/Plan /)).not.toBeInTheDocument();
  });
});
