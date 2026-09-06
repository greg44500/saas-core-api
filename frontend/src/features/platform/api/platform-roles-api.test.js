import { describe, expect, it, vi } from 'vitest';

const captured = vi.hoisted(() => ({
  queryConfig: null,
}));

vi.mock('@/services/api/base-api', () => ({
  baseApi: {
    injectEndpoints: ({ endpoints }) => {
      const builder = {
        query: vi.fn((config) => {
          captured.queryConfig = config;
          return config;
        }),
      };

      endpoints(builder);

      return {
        useListPlatformRolesQuery: vi.fn(),
      };
    },
  },
}));

import '@/features/platform/api/platform-roles-api';

describe('platformRolesApi', () => {
  it('liste les rôles actifs avec un contrat paginé stable', () => {
    expect(captured.queryConfig.query({
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

    const role = {
      id: '507f1f77bcf86cd799439011',
      key: 'technical_support',
      name: 'Support technique',
      permissions: ['platform:overview:read'],
      isSystem: true,
      status: 'active',
    };

    expect(captured.queryConfig.transformResponse({
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
});
