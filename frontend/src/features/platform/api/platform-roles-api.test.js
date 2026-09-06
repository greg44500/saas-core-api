import { describe, expect, it, vi } from 'vitest';

const captured = vi.hoisted(() => ({
  mutations: [],
  queries: [],
}));

vi.mock('@/services/api/base-api', () => ({
  baseApi: {
    injectEndpoints: ({ endpoints }) => {
      const builder = {
        query: vi.fn((config) => {
          captured.queries.push(config);
          return config;
        }),
        mutation: vi.fn((config) => {
          captured.mutations.push(config);
          return config;
        }),
      };

      endpoints(builder);

      return {
        useArchivePlatformRoleMutation: vi.fn(),
        useCreatePlatformRoleMutation: vi.fn(),
        useGetPlatformRolePermissionCatalogQuery: vi.fn(),
        useGetPlatformRoleQuery: vi.fn(),
        useListPlatformRolesQuery: vi.fn(),
        useUpdatePlatformRoleMutation: vi.fn(),
      };
    },
  },
}));

import '@/features/platform/api/platform-roles-api';

describe('platformRolesApi', () => {
  it('liste les rôles actifs ou tous les statuts sans envoyer une valeur non supportée au backend', () => {
    const listConfig = captured.queries[0];

    expect(listConfig.query({
      page: 1,
      limit: 100,
      status: 'active',
    })).toEqual({
      url: '/platform/team/roles',
      params: {
        page: 1,
        limit: 100,
        status: 'active',
      },
    });

    expect(listConfig.query({
      page: 2,
      limit: 20,
      status: 'all',
    })).toEqual({
      url: '/platform/team/roles',
      params: {
        page: 2,
        limit: 20,
      },
    });

    const role = {
      id: '507f1f77bcf86cd799439011',
      key: 'technical_support',
      name: 'Support technique',
      permissions: ['platform:overview:read'],
      isSystem: true,
      status: 'active',
    };

    expect(listConfig.transformResponse({
      data: { roles: [role] },
      meta: {
        page: 1,
        limit: 100,
        total: 1,
        totalPages: 1,
      },
    })).toEqual({
      roles: [role],
      pagination: {
        page: 1,
        limit: 100,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('lit un rôle et le catalogue acteur-aware des permissions', () => {
    const getRoleConfig = captured.queries[1];
    const catalogConfig = captured.queries[2];

    expect(getRoleConfig.query('role-id')).toBe('/platform/team/roles/role-id');
    expect(getRoleConfig.transformResponse({
      data: { role: { id: 'role-id', name: 'Support' } },
    })).toEqual({ id: 'role-id', name: 'Support' });

    expect(catalogConfig.query()).toBe('/platform/team/roles/permissions');
    expect(catalogConfig.transformResponse({
      data: {
        permissions: [
          {
            key: 'platform:users:read',
            label: 'Consulter les utilisateurs',
            assignable: true,
          },
        ],
      },
    })).toHaveLength(1);
  });

  it('utilise les endpoints de création, modification et archivage', () => {
    const [createRole, updateRole, archiveRole] = captured.mutations;

    expect(createRole.query({
      name: 'Support catalogue',
      description: null,
      permissions: ['platform:users:read'],
    })).toEqual({
      url: '/platform/team/roles',
      method: 'POST',
      body: {
        name: 'Support catalogue',
        description: null,
        permissions: ['platform:users:read'],
      },
    });

    expect(updateRole.query({
      roleId: 'role-id',
      body: { name: 'Support avancé' },
    })).toEqual({
      url: '/platform/team/roles/role-id',
      method: 'PATCH',
      body: { name: 'Support avancé' },
    });

    expect(archiveRole.query('role-id')).toEqual({
      url: '/platform/team/roles/role-id/archive',
      method: 'PATCH',
    });
  });
});
