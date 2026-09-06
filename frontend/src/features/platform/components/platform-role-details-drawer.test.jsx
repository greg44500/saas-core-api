import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useCatalog: vi.fn(),
  useRole: vi.fn(),
}));

vi.mock('@/components/shared/entity-details-drawer', () => ({
  EntityDetailsDrawer: ({ children, open, title }) => (
    open ? <aside aria-label={title}>{children}</aside> : null
  ),
}));

vi.mock('@/features/platform/api/platform-roles-api', () => ({
  useGetPlatformRolePermissionCatalogQuery: mocks.useCatalog,
  useGetPlatformRoleQuery: mocks.useRole,
}));

import { PlatformRoleDetailsDrawer } from '@/features/platform/components/platform-role-details-drawer';

describe('PlatformRoleDetailsDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useRole.mockReturnValue({
      data: {
        id: 'role-id',
        key: 'custom_opaque',
        name: 'Support catalogue',
        description: 'Accès de consultation du catalogue.',
        permissions: ['platform:users:read'],
        isSystem: false,
        status: 'active',
      },
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.useCatalog.mockReturnValue({
      data: [
        {
          key: 'platform:users:read',
          label: 'Consulter les utilisateurs',
          category: 'users',
          categoryLabel: 'Utilisateurs',
          description: 'Consulter les comptes utilisateurs.',
          sensitivity: 'delegable',
          assignable: true,
        },
      ],
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  afterEach(() => cleanup());

  it('présente les permissions avec leurs libellés métier sans afficher les clés techniques', () => {
    render(
      <PlatformRoleDetailsDrawer
        onClose={vi.fn()}
        open
        roleId="role-id"
      />,
    );

    expect(screen.getByRole('complementary', { name: 'Support catalogue' })).toBeInTheDocument();
    expect(screen.getByText('Personnalisé')).toBeInTheDocument();
    expect(screen.getByText('Actif')).toBeInTheDocument();
    expect(screen.getByText('Utilisateurs')).toBeInTheDocument();
    expect(screen.getByText('Consulter les utilisateurs')).toBeInTheDocument();
    expect(screen.getByText('Déléguable')).toBeInTheDocument();
    expect(screen.queryByText('custom_opaque')).not.toBeInTheDocument();
    expect(screen.queryByText('platform:users:read')).not.toBeInTheDocument();
  });
});
