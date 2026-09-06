import { describe, expect, it, vi } from 'vitest';

const captured = vi.hoisted(() => ({
  mutations: [],
}));

vi.mock('@/features/platform/api/platform-current-context-api', () => ({
  CURRENT_PLATFORM_CONTEXT_TAG: {
    type: 'CurrentPlatformContext',
    id: 'CURRENT',
  },
}));

vi.mock('@/services/api/base-api', () => ({
  baseApi: {
    injectEndpoints: ({ endpoints }) => {
      const builder = {
        mutation: vi.fn((config) => {
          captured.mutations.push(config);
          return config;
        }),
      };

      endpoints(builder);

      return {
        useAcceptExistingPlatformInvitationMutation: vi.fn(),
        useAcceptNewPlatformInvitationMutation: vi.fn(),
      };
    },
  },
}));

import '@/features/platform-invitation/api/platform-invitation-acceptance-api';

describe('platformInvitationAcceptanceApi', () => {
  it('accepte une invitation pour un compte existant via la route authentifiée', () => {
    const config = captured.mutations[0];
    const token = 'a'.repeat(64);

    expect(config.query(token)).toEqual({
      url: '/platform-invitations/accept-existing',
      method: 'POST',
      body: { token },
    });
    expect(config.transformResponse({
      data: {
        membership: {
          id: 'membership-id',
          status: 'active',
        },
      },
    })).toEqual({
      id: 'membership-id',
      status: 'active',
    });
    expect(config.invalidatesTags).toContainEqual({
      type: 'CurrentPlatformContext',
      id: 'CURRENT',
    });
  });

  it('crée un compte depuis l’invitation sans identité fournie par le frontend', () => {
    const config = captured.mutations[1];
    const token = 'b'.repeat(64);

    expect(config.query({ token, password: 'mot-de-passe-tres-long' })).toEqual({
      url: '/platform-invitations/accept-new',
      method: 'POST',
      body: {
        token,
        password: 'mot-de-passe-tres-long',
      },
    });
    expect(config.extraOptions).toEqual({ skipReauth: true });
    expect(config.transformResponse({
      data: {
        user: { id: 'user-id' },
        membership: { id: 'membership-id' },
      },
    })).toEqual({
      user: { id: 'user-id' },
      membership: { id: 'membership-id' },
    });
  });
});
