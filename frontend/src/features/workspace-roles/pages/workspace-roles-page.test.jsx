import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '@/components/shared/toast-provider';
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

function renderPage() {
  return render(
    <ToastProvider>
      <WorkspaceRolesPage />
    </ToastProvider>,
  );
}

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

  it('affiche les rôles système et personnalisés sans bruit visuel ni action de mutation sur le rôle système', () => {
    renderPage();

    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Support')).toBeInTheDocument();
    expect(screen.getByText('Système')).toBeInTheDocument();
    expect(screen.getByText('Personnalisé')).toBeInTheDocument();

    const ownerRow = screen.getByText('Owner').closest('tr');
    expect(ownerRow).not.toHaveTextContent('Protégé');
    expect(ownerRow).not.toHaveTextContent('Modifier');
    expect(ownerRow).not.toHaveTextContent('Supprimer');
    expect(ownerRow).toHaveTextContent('Voir');
  });

  it('réutilise le drawer de permissions pour consulter un rôle personnalisé', () => {
    renderPage();

    fireEvent.click(screen.getAllByRole('button', { name: 'Voir' })[1]);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Rôle personnalisé')).toBeInTheDocument();
    expect(screen.getByText('Consulter les membres')).toBeInTheDocument();
  });

  it('ne propose pas la permission ownership dans le formulaire de création', () => {
    renderPage();

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

    renderPage();

    expect(
      screen.queryByRole('button', { name: 'Créer un rôle' }),
    ).not.toBeInTheDocument();
  });

  it('garde un refus de suppression dans le bloc de confirmation', async () => {
    mocks.deleteRole.mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({
        data: { message: 'Ce rôle est encore utilisé' },
      }),
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la suppression' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ce rôle est encore utilisé',
    );
    expect(screen.getByText('Supprimer le rôle « Support » ?')).toBeInTheDocument();
  });

  it('n’autorise pas l’administration d’un rôle personnalisé plus puissant que l’acteur sans afficher de statut technique', () => {
    mocks.rolesQuery.data = [
      {
        id: 'advanced-role',
        key: 'custom-advanced',
        name: 'Avancé',
        description: null,
        permissions: ['workspace:read', 'file:delete'],
        isSystem: false,
        isEditable: true,
      },
    ];

    renderPage();

    const row = screen.getByText('Avancé').closest('tr');
    expect(row).not.toHaveTextContent('Niveau supérieur');
    expect(row).not.toHaveTextContent('Modifier');
    expect(row).not.toHaveTextContent('Supprimer');
    expect(row).toHaveTextContent('Voir');
  });
});
