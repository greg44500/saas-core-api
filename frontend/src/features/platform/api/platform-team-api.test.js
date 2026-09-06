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
        useGetPlatformTeamSummaryQuery: vi.fn(),
        useListPlatformTeamMembersQuery: vi.fn(),
        useReactivatePlatformTeamMemberMutation: vi.fn(),
        useRevokePlatformTeamMemberMutation: vi.fn(),
        useSuspendPlatformTeamMemberMutation: vi.fn(),
        useUpdatePlatformTeamMemberRoleMutation: vi.fn(),
      };
    },
  },
}));

import '@/features/platform/api/platform-team-api';

describe('platformTeamApi', () => {
  it('conserve le contrat paginé de lecture des membres', () => {
    const listConfig = captured.queries[0];

    expect(listConfig.query({ page: 2, limit: 20 })).toEqual({
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

    expect(listConfig.transformResponse({
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

  it('lit le snapshot agrégé sans reconstruire les KPI côté frontend', () => {
    const summaryConfig = captured.queries[1];
    const summary = {
      total: 4,
      active: 3,
      suspended: 1,
      founderCount: 1,
      byRole: [
        {
          role: { id: 'role-id', name: 'Support technique' },
          total: 3,
          active: 2,
          suspended: 1,
          percentage: 75,
        },
      ],
    };

    expect(summaryConfig.query()).toBe('/platform/team/summary');
    expect(summaryConfig.transformResponse({
      data: { summary },
    })).toEqual(summary);
    expect(summaryConfig.providesTags).toEqual([
      { type: 'PlatformTeamSummary', id: 'CURRENT' },
    ]);
  });

  it('utilise les quatre endpoints backend de cycle de vie et invalide le snapshot', () => {
    const [updateRole, suspend, reactivate, revoke] = captured.mutations;
    const summaryTag = { type: 'PlatformTeamSummary', id: 'CURRENT' };

    expect(updateRole.query({
      memberId: 'member-id',
      roleId: 'role-id',
    })).toEqual({
      url: '/platform/team/members/member-id/role',
      method: 'PATCH',
      body: { roleId: 'role-id' },
    });

    expect(suspend.query('member-id')).toEqual({
      url: '/platform/team/members/member-id/suspend',
      method: 'PATCH',
    });
    expect(reactivate.query('member-id')).toEqual({
      url: '/platform/team/members/member-id/reactivate',
      method: 'PATCH',
    });
    expect(revoke.query('member-id')).toEqual({
      url: '/platform/team/members/member-id',
      method: 'DELETE',
    });

    expect(updateRole.invalidatesTags(null, null, {
      memberId: 'member-id',
    })).toContainEqual(summaryTag);
    expect(suspend.invalidatesTags(null, null, 'member-id')).toContainEqual(
      summaryTag,
    );
    expect(reactivate.invalidatesTags(null, null, 'member-id')).toContainEqual(
      summaryTag,
    );
    expect(revoke.invalidatesTags(null, null, 'member-id')).toContainEqual(
      summaryTag,
    );
  });
});
