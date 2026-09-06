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
        useCreatePlatformTeamInvitationMutation: vi.fn(),
        useListPlatformTeamInvitationsQuery: vi.fn(),
        useResendPlatformTeamInvitationMutation: vi.fn(),
        useRevokePlatformTeamInvitationMutation: vi.fn(),
      };
    },
  },
}));

import '@/features/platform/api/platform-invitations-api';

describe('platformInvitationsApi', () => {
  it('conserve le contrat paginé de lecture des invitations actives', () => {
    const listConfig = captured.queries[0];
    const invitation = {
      id: 'invitation-id',
      firstName: 'Marie',
      lastName: 'Martin',
      email: 'marie@example.com',
      deliveryStatus: 'sent',
      expiresAt: '2026-09-13T10:00:00.000Z',
      role: {
        id: 'role-id',
        key: 'technical_support',
        name: 'Support technique',
      },
    };

    expect(listConfig.query({ page: 2, limit: 20 })).toEqual({
      url: '/platform/team/invitations',
      params: { page: 2, limit: 20 },
    });

    expect(listConfig.transformResponse({
      data: { invitations: [invitation] },
      meta: {
        page: 2,
        limit: 20,
        total: 21,
        totalPages: 2,
      },
    })).toEqual({
      invitations: [invitation],
      pagination: {
        page: 2,
        limit: 20,
        total: 21,
        totalPages: 2,
      },
    });
  });

  it('utilise les endpoints create, resend et revoke du backend', () => {
    const [create, resend, revoke] = captured.mutations;

    expect(create.query({
      firstName: 'Marie',
      lastName: 'Martin',
      email: 'marie@example.com',
      roleId: '507f1f77bcf86cd799439011',
    })).toEqual({
      url: '/platform/team/invitations',
      method: 'POST',
      body: {
        firstName: 'Marie',
        lastName: 'Martin',
        email: 'marie@example.com',
        roleId: '507f1f77bcf86cd799439011',
      },
    });

    expect(resend.query('invitation-id')).toEqual({
      url: '/platform/team/invitations/invitation-id/resend',
      method: 'POST',
    });

    expect(revoke.query('invitation-id')).toEqual({
      url: '/platform/team/invitations/invitation-id',
      method: 'DELETE',
    });
  });

  it('invalide la liste après toute mutation', () => {
    const [create, resend, revoke] = captured.mutations;
    const listTag = { type: 'PlatformTeamInvitations', id: 'LIST' };

    expect(create.invalidatesTags).toContainEqual(listTag);
    expect(resend.invalidatesTags(null, null, 'invitation-id')).toContainEqual(
      listTag,
    );
    expect(revoke.invalidatesTags(null, null, 'invitation-id')).toContainEqual(
      listTag,
    );
  });
});
