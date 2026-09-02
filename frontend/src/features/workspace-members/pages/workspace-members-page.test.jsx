import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  useListWorkspaceInvitationsQuery: mocks.useListWorkspaceInvitationsQuery,
  useCreateWorkspaceInvitationMutation: mocks.useCreateWorkspaceInvitationMutation,
  useResendWorkspaceInvitationMutation: mocks.useResendWorkspaceInvitationMutation,
  useRevokeWorkspaceInvitationMutation: mocks.useRevokeWorkspaceInvitationMutation,
  useUpdateWorkspaceMemberRoleMutation: mocks.useUpdateWorkspaceMemberRoleMutation,
  useSuspendWorkspaceMemberMutation: mocks.useSuspendWorkspaceMemberMutation,
  useRemoveWorkspaceMemberMutation: mocks.useRemoveWorkspaceMemberMutation,
}));

vi.mock('@/features/workspace-roles/api/workspace-roles-api', () => ({
  useListWorkspaceRolesQuery: mocks.useListWorkspaceRolesQuery,
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
            joinedAt: '2026-08-20T10:00:00.000Z',
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
        {
          id: 'role-owner',
          key: 'owner',
          name: 'Propriétaire',
          isSystem: true,
          permissions: [
            WORKSPACE_PERMISSION.WORKSPACE_READ,
            WORKSPACE_PERMISSION.MEMBER_READ,
            WORKSPACE_PERMISSION.MEMBER_INVITE,
            WORKSPACE_PERMISSION.ROLE_READ,
          ],
        },
        {
          id: 'role-admin',
          key: 'admin',
          name: 'Administrateur',
          description: 'Administre les accès du workspace.',
          isSystem: true,
          permissions: [
            WORKSPACE_PERMISSION.MEMBER_READ,
            WORKSPACE_PERMISSION.MEMBER_INVITE,
            WORKSPACE_PERMISSION.ROLE_READ,
          ],
        },
        {
          id: 'role-member',
          key: 'member',
          name: 'Membre',
          isSystem: true,
          permissions: [
            WORKSPACE_PERMISSION.MEMBER_READ,
            WORKSPACE_PERMISSION.ROLE_READ,
          ],
        },
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

  it('affiche les membres sans répéter un statut technique de protection', () => {
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
    expect(screen.queryByText('Protégé')).not.toBeInTheDocument();
    expect(screen.getAllByText('Actif')).toHaveLength(2);
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
    expect(screen.getByLabelText('Email du membre')).toHaveAttribute('placeholder', 'membre@entreprise.fr');
    expect(screen.getByLabelText('Rôle du membre')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Propriétaire' })).not.toBeInTheDocument();
  });

  it('ouvre le détail du membre avec les permissions de son rôle', async () => {
    const user = userEvent.setup();

    renderPage([
      WORKSPACE_PERMISSION.MEMBER_READ,
      WORKSPACE_PERMISSION.ROLE_READ,
    ]);

    const viewButtons = screen.getAllByRole('button', { name: 'Voir' });
    await user.click(viewButtons[1]);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument();
    expect(screen.getByText('Consulter les membres')).toBeInTheDocument();
    expect(screen.getByText('member:read')).toBeInTheDocument();
  });

  it('permet de consulter les permissions du rôle choisi avant invitation', async () => {
    const user = userEvent.setup();

    renderPage([
      WORKSPACE_PERMISSION.MEMBER_READ,
      WORKSPACE_PERMISSION.MEMBER_INVITE,
      WORKSPACE_PERMISSION.ROLE_READ,
    ]);

    await user.selectOptions(screen.getByLabelText('Rôle du membre'), 'role-admin');
    await user.click(screen.getByRole('button', { name: 'Voir les permissions détaillées' }));

    expect(screen.getByRole('heading', { name: 'Administrateur' })).toBeInTheDocument();
    expect(screen.getByText('Inviter des membres')).toBeInTheDocument();
    expect(screen.getByText('member:invite')).toBeInTheDocument();
  });

  it('masque un rôle qui déléguerait une permission absente chez l’acteur', () => {
    mocks.useListWorkspaceRolesQuery.mockReturnValue({
      data: [
        {
          id: 'role-stronger',
          key: 'stronger',
          name: 'Rôle trop puissant',
          permissions: [
            WORKSPACE_PERMISSION.MEMBER_READ,
            WORKSPACE_PERMISSION.MEMBER_INVITE,
            WORKSPACE_PERMISSION.MEMBER_REMOVE,
            WORKSPACE_PERMISSION.ROLE_READ,
          ],
        },
      ],
    });

    renderPage([
      WORKSPACE_PERMISSION.MEMBER_READ,
      WORKSPACE_PERMISSION.MEMBER_INVITE,
      WORKSPACE_PERMISSION.ROLE_READ,
    ]);

    expect(screen.queryByRole('option', { name: 'Rôle trop puissant' })).not.toBeInTheDocument();
  });
});
