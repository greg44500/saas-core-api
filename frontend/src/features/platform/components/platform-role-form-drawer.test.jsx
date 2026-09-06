import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createRole: vi.fn(),
  updateRole: vi.fn(),
  toast: vi.fn(),
  useCatalog: vi.fn(),
}));

vi.mock('@/components/shared/entity-details-drawer', () => ({
  EntityDetailsDrawer: ({ children, open, title }) => (
    open ? <aside aria-label={title}>{children}</aside> : null
  ),
}));

vi.mock('@/components/shared/toast-provider', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/features/platform/api/platform-roles-api', () => ({
  useCreatePlatformRoleMutation: () => [
    mocks.createRole,
    { isLoading: false },
  ],
  useGetPlatformRolePermissionCatalogQuery: mocks.useCatalog,
  useUpdatePlatformRoleMutation: () => [
    mocks.updateRole,
    { isLoading: false },
  ],
}));

import { PlatformRoleFormDrawer } from '@/features/platform/components/platform-role-form-drawer';

const catalog = [
  {
    key: 'platform:users:read',
    label: 'Consulter les utilisateurs',
    category: 'users',
    categoryLabel: 'Utilisateurs',
    description: 'Consulter les comptes.',
    sensitivity: 'delegable',
    assignable: true,
  },
  {
    key: 'platform:users:close',
    label: 'Fermer un utilisateur',
    category: 'users',
    categoryLabel: 'Utilisateurs',
    description: 'Fermer définitivement un compte.',
    sensitivity: 'reserved',
    assignable: false,
  },
];

const superAdminAccess = {
  role: { key: 'super_admin' },
  permissions: [
    'platform:roles:create',
    'platform:roles:update',
    'platform:users:read',
    'platform:users:close',
  ],
};

describe('PlatformRoleFormDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useCatalog.mockReturnValue({
      data: catalog,
      isError: false,
      isLoading: false,
    });
    mocks.createRole.mockImplementation(() => ({
      unwrap: vi.fn().mockResolvedValue({ id: 'role-id' }),
    }));
    mocks.updateRole.mockImplementation(() => ({
      unwrap: vi.fn().mockResolvedValue({ id: 'role-id' }),
    }));
  });

  afterEach(() => cleanup());

  it('crée un rôle sans exposer ni envoyer de clé technique', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <PlatformRoleFormDrawer
        onClose={onClose}
        open
        platformAccess={superAdminAccess}
      />,
    );

    expect(screen.queryByLabelText(/clé/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Nom du rôle'), 'Support catalogue');
    await user.type(
      screen.getByLabelText('Justification métier'),
      'Accès lecture catalogue nécessaire au support.',
    );
    await user.click(
      screen.getByRole('checkbox', { name: 'Consulter les utilisateurs' }),
    );
    await user.click(screen.getByRole('button', { name: 'Créer le rôle' }));

    expect(mocks.createRole).toHaveBeenCalledWith({
      name: 'Support catalogue',
      description: 'Accès lecture catalogue nécessaire au support.',
      permissions: ['platform:users:read'],
    });
    expect(mocks.createRole.mock.calls[0][0]).not.toHaveProperty('key');
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Rôle créé',
      variant: 'success',
    }));
    expect(onClose).toHaveBeenCalled();
  });

  it('refuse la création sans justification métier', async () => {
    const user = userEvent.setup();

    render(
      <PlatformRoleFormDrawer
        onClose={vi.fn()}
        open
        platformAccess={superAdminAccess}
      />,
    );

    await user.type(screen.getByLabelText('Nom du rôle'), 'Support catalogue');
    await user.click(screen.getByRole('button', { name: 'Créer le rôle' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      /justification métier est obligatoire/i,
    );
    expect(mocks.createRole).not.toHaveBeenCalled();
  });

  it('ne rend pas le formulaire pour un acteur qui ne gouverne pas les rôles personnalisés', () => {
    const platformAdminAccess = {
      role: { key: 'platform_admin' },
      permissions: [
        'platform:roles:create',
        'platform:roles:update',
        'platform:users:read',
      ],
    };

    render(
      <PlatformRoleFormDrawer
        onClose={vi.fn()}
        open
        platformAccess={platformAdminAccess}
      />,
    );

    expect(screen.queryByLabelText('Nom du rôle')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Justification métier')).not.toBeInTheDocument();
    expect(mocks.useCatalog).toHaveBeenCalledWith(undefined, { skip: true });
  });

  it('préremplit un rôle personnalisé en modification et conserve sa clé hors formulaire', () => {
    render(
      <PlatformRoleFormDrawer
        mode="edit"
        onClose={vi.fn()}
        open
        platformAccess={superAdminAccess}
        role={{
          id: 'role-id',
          key: 'custom_opaque-key',
          name: 'Support catalogue',
          description: 'Description existante',
          permissions: ['platform:users:read'],
        }}
      />,
    );

    expect(screen.getByLabelText('Nom du rôle')).toHaveValue('Support catalogue');
    expect(screen.getByLabelText('Justification métier')).toHaveValue('Description existante');
    expect(
      screen.getByRole('checkbox', { name: 'Consulter les utilisateurs' }),
    ).toBeChecked();
    expect(screen.queryByDisplayValue('custom_opaque-key')).not.toBeInTheDocument();
  });
});
