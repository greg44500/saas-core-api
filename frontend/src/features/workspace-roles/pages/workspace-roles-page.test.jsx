import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkspaceRolesPage } from '@/features/workspace-roles/pages/workspace-roles-page';

const mocks = vi.hoisted(() => ({
  can: vi.fn(),
  createRole: vi.fn(),
  deleteRole: vi.fn(),
  updateRole: vi.fn(),
  rolesQuery: {
    data: [],
    error: null,
    isLoading: false,
    refetch: vi.fn(),
  },
}));

vi.mock('@/features/workspace/components/workspace-context', () => ({
  useWorkspaceContext: () => ({
    workspace: { id: 'workspace-id', name: 'Acme' },
    permissions: [
      'workspace:read',
      'workspace:ownership:transfer',
      'member:read',
      'role:read',
      'role:create',
      'role:update',
      'role:delete',
    ],
    can: mocks.can,
  }),
}));

vi.mock('@/features/workspace-roles/api/workspace-roles-api', () => ({
  useListWorkspaceRolesQuery: () => mocks.rolesQuery,
  useCreateWorkspaceRoleMutation: () => [
    mocks.createRole,
    { isLoading: false },
  ],
  useUpdateWorkspaceRoleMutation: () => [
    mocks.updateRole,
    { isLoading: false },
  ],
  useDeleteWorkspaceRoleMutation: () => [
    mocks.deleteRole,
    { isLoading: false },
  ],
}));

describe('WorkspaceRolesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.can.mockReturnValue(true);
    mocks.rolesQuery.data = [
      {
        id: 'owner-role',
        key: 'owner',
        name: 'Owner',
        description: 'Rôle propriétaire.',
        permissions: ['workspace:read', 'workspace:ownership:transfer'],
        isSystem: true,
        isEditable: false,
      },
      {
        id: 'support-role',
        key: 'custom-support',
        name: 'Support',
        description: 'Support client.',
        permissions: ['workspace:read', 'member:read'],
        isSystem: false,
        isEditable: true,
      },
    ];
  });

  it('affiche les rôles système et personnalisés sans action de mutation sur le rôle système', () => {
    render(<WorkspaceRolesPage />);

    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Support')).toBeInTheDocument();
    expect(screen.getByText('Système')).toBeInTheDocument();
    expect(screen.getByText('Personnalisé')).toBeInTheDocument();

    const ownerRow = screen.getByText('Owner').closest('tr');
    expect(ownerRow).toHaveTextContent('Protégé');
    expect(ownerRow).not.toHaveTextContent('Modifier');
    expect(ownerRow).not.toHaveTextContent('Supprimer');
  });

  it('réutilise le drawer de permissions pour consulter un rôle', () => {
    render(<WorkspaceRolesPage />);

    const supportRow = screen.getByText('Support').closest('tr');
    fireEvent.click(screen.getByRole('button', { name: 'Voir' , hidden: false, exact: true }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Rôle système')).toBeInTheDocument();
    expect(supportRow).toBeInTheDocument();
  });

  it('ne propose pas la permission ownership dans le formulaire de création', () => {
    render(<WorkspaceRolesPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Créer un rôle' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Consulter le workspace')).toBeInTheDocument();
    expect(screen.getByText('Consulter les membres')).toBeInTheDocument();
    expect(
      screen.queryByText('Transférer la propriété du workspace'),
    ).not.toBeInTheDocument();
  });

  it('masque la création quand role:create est absent', () => {
    mocks.can.mockImplementation(
      (permission) => permission !== 'role:create',
    );

    render(<WorkspaceRolesPage />);

    expect(
      screen.queryByRole('button', { name: 'Créer un rôle' }),
    ).not.toBeInTheDocument();
  });
});
