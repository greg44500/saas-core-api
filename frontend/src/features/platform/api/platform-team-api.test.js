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
        useListPlatformTeamMembersQuery: vi.fn(),
      };
    },
  },
}));

import '@/features/platform/api/platform-team-api';

describe('platformTeamApi', () => {
  it('conserve le contrat paginé de lecture des membres', () => {
    expect(captured.queryConfig.query({ page: 2, limit: 20 })).toEqual({
      url: '/platform/team/members',
      params: { page: 2, limit: 20 },
    });

    const member = {
      id: 'member-id',
      isFounder: true,
      status: 'active',
      role: { name: 'Super administrateur' },
      user: {
        id: 'user-id',
        firstName: 'Gregory',
        lastName: 'BALLAT',
        email: 'gregory@example.com',
      },
    };

    expect(captured.queryConfig.transformResponse({
      data: { members: [member] },
      meta: {
        page: 2,
        limit: 20,
        total: 21,
        totalPages: 2,
      },
    })).toEqual({
      members: [member],
      pagination: {
        page: 2,
        limit: 20,
        total: 21,
        totalPages: 2,
      },
    });
  });
});
