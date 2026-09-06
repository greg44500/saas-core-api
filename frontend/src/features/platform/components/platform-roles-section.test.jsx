import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';

const mocks = vi.hoisted(() => ({
  archiveRole: vi.fn(),
  toast: vi.fn(),
  useCurrentContext: vi.fn(),
  useListRoles: vi.fn(),
}));

vi.mock('@/components/shared/toast-provider', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/features/platform/api/platform-current-context-api', () => ({
  useGetCurrentPlatformContextQuery: mocks.useCurrentContext,
}));

vi.mock('@/features/platform/api/platform-roles-api', () => ({
  useArchivePlatformRoleMutation: () => [
    mocks.archiveRole,
    { isLoading: false },
  ],
  useListPlatformRolesQuery: mocks.useListRoles,
}));

vi.mock('@/features/platform/components/platform-role-details-drawer', () => ({
  PlatformRoleDetailsDrawer: ({ open, roleId }) => (
    open ? <div data-testid="role-details">Détail {roleId}</div> : null
  ),
}));

vi.mock('@/features/platform/components/platform-role-form-drawer', () => ({
  PlatformRoleFormDrawer: ({ mode, open, role }) => (
    open ? <div data-testid="role-form">{mode}:{role?.name ?? 'nouveau'}</div> : null
  ),
}));

import { PlatformRolesSection } from '@/features/platform/components/platform-roles-section';

const roles = [
  {
    id: 'system-role-id',
    key: 'technical_support',
    name: 'Support technique',
    description: 'Rôle système protégé.',
    permissions: ['platform:overview:read'],
    isSystem: true,
    status: 'active',
  },
  {
    id: 'custom-role-id',
    key: 'custom_opaque',
    name: 'Support catalogue',
    description: 'Rôle personnalisé.',
    permissions: ['platform:users:read'],
    isSystem: false,
    status: 'active',
  },
  {
    id: 'archived-role-id',
    key: 'custom_archived',
    name: 'Ancien support',
    description: null,
    permissions: [],
    isSystem: false,
    status: 'archived',
  },
];

const superAdminAccess = {
  role: { key: 'super_admin' },
  permissions: [
    PLATFORM_PERMISSION.ROLES_READ,
    PLATFORM_PERMISSION.ROLES_CREATE,
    PLATFORM_PERMISSION.ROLES_UPDATE,
    PLATFORM_PERMISSION.ROLES_ARCHIVE,
  ],
};

describe('PlatformRolesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useCurrentContext.mockReturnValue({ data: superAdminAccess });
    mocks.useListRoles.mockReturnValue({
      data: {
        roles,
        pagination: {
          page: 1,
          limit: 20,
          total: 3,
          totalPages: 1,
        },
      },
      isError: false,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.archiveRole.mockImplementation(() => ({
      unwrap: vi.fn().mockResolvedValue({
        ...roles[1],
        status: 'archived',
      }),
    }));
  });

  afterEach(() => cleanup());

  it('affiche les rôles système, personnalisés et archivés sans exposer leur clé technique', () => {
    render(<PlatformRolesSection />);

    expect(screen.getByText('Support technique')).toBeInTheDocument();
    expect(screen.getByText('Support catalogue')).toBeInTheDocument();
    expect(screen.getByText('Ancien support')).toBeInTheDocument();
    expect(screen.getAllByText('Système')).toHaveLength(1);
    expect(screen.getAllByText('Personnalisé')).toHaveLength(2);
    expect(screen.getByText('Archivé')).toBeInTheDocument();
    expect(screen.queryByText('custom_opaque')).not.toBeInTheDocument();
  });

  it('compacte le tableau et expose la description uniquement via InfoTooltip', async () => {
    const user = userEvent.setup();
    render(<PlatformRolesSection />);

    const table = screen.getByRole('table');
    expect(table).toHaveClass('table-fixed');
    expect(table.parentElement).toHaveClass('overflow-x-hidden');

    expect(screen.queryByText('Rôle système protégé.')).not.toBeInTheDocument();

    const descriptionButton = screen.getByRole('button', {
      name: 'Description du rôle Support technique',
    });
    await user.hover(descriptionButton);

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Rôle système protégé.',
    );
  });

  it('protège les rôles système et archivés mais permet les actions sur un rôle personnalisé actif', async () => {
    const user = userEvent.setup();
    render(<PlatformRolesSection />);

    expect(
      screen.queryByRole('button', { name: 'Modifier le rôle Support technique' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Archiver le rôle Support technique' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Modifier le rôle Ancien support' }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Modifier le rôle Support catalogue' }),
    );
    expect(screen.getByTestId('role-form')).toHaveTextContent(
      'edit:Support catalogue',
    );
  });

  it('ouvre le détail pour tout rôle et confirme l’archivage d’un rôle personnalisé', async () => {
    const user = userEvent.setup();
    render(<PlatformRolesSection />);

    await user.click(
      screen.getByRole('button', { name: 'Voir les permissions de Support technique' }),
    );
    expect(screen.getByTestId('role-details')).toHaveTextContent('system-role-id');

    await user.click(
      screen.getByRole('button', { name: 'Archiver le rôle Support catalogue' }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Archiver le rôle' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Archiver' }));
    expect(mocks.archiveRole).toHaveBeenCalledWith('custom-role-id');
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Rôle archivé',
      variant: 'success',
    }));
  });

  it('masque les mutations à un Administrateur de la Plateforme même s’il possède encore les permissions techniques correspondantes', () => {
    mocks.useCurrentContext.mockReturnValue({
      data: {
        role: { key: 'platform_admin' },
        permissions: [
          PLATFORM_PERMISSION.ROLES_READ,
          PLATFORM_PERMISSION.ROLES_CREATE,
          PLATFORM_PERMISSION.ROLES_UPDATE,
          PLATFORM_PERMISSION.ROLES_ARCHIVE,
          PLATFORM_PERMISSION.USERS_READ,
        ],
      },
    });

    render(<PlatformRolesSection />);

    expect(
      screen.queryByRole('button', { name: 'Créer un rôle' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Modifier le rôle/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Archiver le rôle/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Voir les permissions de Support technique' }),
    ).toBeInTheDocument();
  });
});
