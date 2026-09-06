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
        useDisablePlatformUserMutation: vi.fn(),
        useEnablePlatformUserMutation: vi.fn(),
        useGetPlatformUserQuery: vi.fn(),
        useListPlatformUsersQuery: vi.fn(),
        useRevokePlatformUserSessionsMutation: vi.fn(),
      };
    },
  },
}));

import '@/features/platform/api/platform-users-api';

describe('platformUsersApi', () => {
  it('n’expose que les mutations de cycle de vie encore supportées par le backend', () => {
    expect(captured.mutations).toHaveLength(3);

    const [disable, enable, revokeSessions] = captured.mutations;

    expect(disable.query({
      userId: 'user-id',
      disabledReason: 'Incident de sécurité',
    })).toEqual({
      url: '/platform/users/user-id/disable',
      method: 'PATCH',
      body: { disabledReason: 'Incident de sécurité' },
    });

    expect(enable.query('user-id')).toEqual({
      url: '/platform/users/user-id/enable',
      method: 'PATCH',
    });

    expect(revokeSessions.query('user-id')).toEqual({
      url: '/platform/users/user-id/revoke-sessions',
      method: 'POST',
    });
  });

  it('ne recrée jamais la route legacy /platform/users/:id/role', () => {
    const serializedMutations = captured.mutations
      .map((mutation) => mutation.query)
      .map((query) => {
        try {
          return query({
            userId: 'user-id',
            disabledReason: 'Motif',
          });
        } catch {
          return null;
        }
      });

    expect(
      serializedMutations.some((config) => config?.url === '/platform/users/user-id/role'),
    ).toBe(false);
  });
});
