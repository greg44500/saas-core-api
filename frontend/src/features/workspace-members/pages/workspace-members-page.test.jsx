import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useGetCurrentUserQuery: vi.fn(),
  useListWorkspaceMembersQuery: vi.fn(),
  useListWorkspaceRolesQuery: vi.fn(),
  useListWorkspaceInvitationsQuery: vi.fn(),
  useCreateWorkspaceInvitationMutation: vi.fn(),
  useResendWorkspaceInvitationMutation: vi.fn(),
  useRevokeWorkspaceInvitationMutation: vi.fn(),
  useUpdateWorkspaceMemberRoleMutation: vi.fn(),
  useSuspendWorkspaceMemberMutation: vi.fn(),
  useRemoveWorkspaceMemberMutation: vi.fn(),
}));

vi.mock('@/features/auth/api/auth-api', () => ({
  useGetCurrentUserQuery: mocks.useGetCurrentUserQuery,
}));

vi.mock('@/features/workspace-members/api/workspace-members-api', () => ({
  useListWorkspaceMembersQuery: mocks.useListWorkspaceMembersQuery,
  useListWorkspaceRolesQuery: mocks.useListWorkspaceRolesQuery,
  useListWorkspaceInvitationsQuery: mocks.useListWorkspaceInvitationsQuery,
  useCreateWorkspaceInvitationMutation: mocks.useCreateWorkspaceInvitationMutation,
  useResendWorkspaceInvitationMutation: mocks.useResendWorkspaceInvitationMutation,
  useRevokeWorkspaceInvitationMutation: mocks.useRevokeWorkspaceInvitationMutation,
  useUpdateWorkspaceMemberRoleMutation: mocks.useUpdateWorkspaceMemberRoleMutation,
  useSuspendWorkspaceMemberMutation: mocks.useSuspendWorkspaceMemberMutation,
  useRemoveWorkspaceMemberMutation: mocks.useRemoveWorkspaceMemberMutation,
}));

import { WorkspaceProvider } from '@/features/workspace/components/workspace-context';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';
import { WorkspaceMembersPage } from '@/features/workspace-members/pages/workspace-members-page';

const workspace = { id: 'workspace-1', name: 'Acme', status: 'active' };
const membership = {
  id: 'membership-owner',
  role: { key: 'owner', name: 'Propriétaire' },
};

function mutationMock() {
  return [vi.fn(), { isLoading: false }];
}

function renderPage(permissions) {
  return render(
    <WorkspaceProvider
      workspace={workspace}
      membership={membership}
      permissions={permissions}
    >
      <WorkspaceMembersPage />
    </WorkspaceProvider>,
  );
}

describe('WorkspaceMembersPage', () => {
  beforeEach(() => {
    mocks.useGetCurrentUserQuery.mockReturnValue({
      data: { id: 'user-owner', firstName: 'Owner', lastName: 'User' },
    });
    mocks.useListWorkspaceMembersQuery.mockReturnValue({
      data: {
        members: [
          {
            id: 'membership-owner',
            status: 'active',
            user: { id: 'user-owner', firstName: 'Owner', lastName: 'User' },
            role: { id: 'role-owner', key: 'owner', name: 'Propriétaire' },
          },
          {
            id: 'membership-member',
            status: 'active',
            user: { id: 'user-member', firstName: 'Jane', lastName: 'Doe' },
            role: { id: 'role-member', key: 'member', name: 'Membre' },
          },
        ],
        pagination: { page: 1, totalPages: 1 },
      },
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    });
    mocks.useListWorkspaceRolesQuery.mockReturnValue({
      data: [
        { id: 'role-owner', key: 'owner', name: 'Propriétaire' },
        { id: 'role-admin', key: 'admin', name: 'Administrateur' },
        { id: 'role-member', key: 'member', name: 'Membre' },
      ],
    });
    mocks.useListWorkspaceInvitationsQuery.mockReturnValue({
      data: { invitations: [], pagination: { page: 1, totalPages: 1 } },
    });
    mocks.useCreateWorkspaceInvitationMutation.mockReturnValue(mutationMock());
    mocks.useResendWorkspaceInvitationMutation.mockReturnValue(mutationMock());
    mocks.useRevokeWorkspaceInvitationMutation.mockReturnValue(mutationMock());
    mocks.useUpdateWorkspaceMemberRoleMutation.mockReturnValue(mutationMock());
    mocks.useSuspendWorkspaceMemberMutation.mockReturnValue(mutationMock());
    mocks.useRemoveWorkspaceMemberMutation.mockReturnValue(mutationMock());
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('affiche les membres et protège le propriétaire courant', () => {
    renderPage([
      WORKSPACE_PERMISSION.MEMBER_READ,
      WORKSPACE_PERMISSION.MEMBER_UPDATE,
      WORKSPACE_PERMISSION.MEMBER_SUSPEND,
      WORKSPACE_PERMISSION.MEMBER_REMOVE,
      WORKSPACE_PERMISSION.ROLE_READ,
    ]);

    expect(screen.getByRole('heading', { name: 'Membres' })).toBeInTheDocument();
    expect(screen.getByText('Owner User')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Vous')).toBeInTheDocument();
    expect(screen.getByText('Protégé')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Suspendre' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retirer' })).toBeInTheDocument();
  });

  it('affiche le formulaire d’invitation seulement avec les permissions requises', () => {
    renderPage([
      WORKSPACE_PERMISSION.MEMBER_READ,
      WORKSPACE_PERMISSION.MEMBER_INVITE,
      WORKSPACE_PERMISSION.ROLE_READ,
    ]);

    expect(screen.getByRole('heading', { name: 'Inviter un membre' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email du membre')).toBeInTheDocument();
    expect(screen.getByLabelText('Rôle du membre')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Propriétaire' })).not.toBeInTheDocument();
  });
});
