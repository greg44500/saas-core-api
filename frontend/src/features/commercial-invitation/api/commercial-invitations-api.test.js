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
        useAcceptCommercialInvitationMutation: vi.fn(),
        useCreateCommercialInvitationMutation: vi.fn(),
        useListCommercialInvitationOffersQuery: vi.fn(),
        useListCommercialInvitationsQuery: vi.fn(),
        usePreviewCommercialInvitationMutation: vi.fn(),
        useResendCommercialInvitationMutation: vi.fn(),
        useRevokeCommercialInvitationMutation: vi.fn(),
      };
    },
  },
}));

import '@/features/commercial-invitation/api/commercial-invitations-api';

describe('commercialInvitationsApi', () => {
  it('lit le catalogue privé dédié et le listing paginé', () => {
    const [offers, list] = captured.queries;

    expect(offers.query()).toBe('/platform/commercial-invitations/offers');
    expect(offers.transformResponse({
      data: { plans: [{ id: 'plan-id', name: 'Découverte' }] },
    })).toEqual([{ id: 'plan-id', name: 'Découverte' }]);

    expect(list.query({ page: 2, limit: 20 })).toEqual({
      url: '/platform/commercial-invitations',
      params: { page: 2, limit: 20 },
    });
    expect(list.transformResponse({
      data: { invitations: [{ id: 'invitation-id' }] },
      meta: {
        page: 2,
        limit: 20,
        total: 21,
        totalPages: 2,
      },
    })).toEqual({
      invitations: [{ id: 'invitation-id' }],
      pagination: {
        page: 2,
        limit: 20,
        total: 21,
        totalPages: 2,
      },
    });
  });

  it('respecte les contrats create, resend et revoke', () => {
    const [create, resend, revoke] = captured.mutations;
    const payload = {
      email: 'beta@example.com',
      planId: '507f1f77bcf86cd799439011',
      workspaceName: 'Beta Workspace',
      billingInterval: 'none',
      reason: 'Programme bêta',
    };

    expect(create.query(payload)).toEqual({
      url: '/platform/commercial-invitations',
      method: 'POST',
      body: payload,
    });
    expect(resend.query('invitation-id')).toEqual({
      url: '/platform/commercial-invitations/invitation-id/resend',
      method: 'POST',
    });
    expect(revoke.query({
      invitationId: 'invitation-id',
      reason: 'Offre retirée',
    })).toEqual({
      url: '/platform/commercial-invitations/invitation-id/revoke',
      method: 'POST',
      body: { reason: 'Offre retirée' },
    });
  });

  it('envoie le token uniquement dans le body des endpoints bénéficiaire', () => {
    const preview = captured.mutations[3];
    const accept = captured.mutations[4];
    const token = 'a'.repeat(64);

    expect(preview.query(token)).toEqual({
      url: '/commercial-invitations/preview',
      method: 'POST',
      body: { token },
    });
    expect(accept.query(token)).toEqual({
      url: '/commercial-invitations/accept',
      method: 'POST',
      body: { token },
    });
  });
});
