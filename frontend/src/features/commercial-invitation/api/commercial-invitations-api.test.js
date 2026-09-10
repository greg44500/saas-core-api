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
        useDeclineCommercialInvitationMutation: vi.fn(),
        useListCommercialInvitationOffersQuery: vi.fn(),
        useListCommercialInvitationsQuery: vi.fn(),
        usePreviewCommercialInvitationMutation: vi.fn(),
        useRegisterCommercialInvitationRecipientMutation: vi.fn(),
        useResendCommercialInvitationMutation: vi.fn(),
        useRevokeCommercialInvitationMutation: vi.fn(),
        useVerifyCommercialInvitationRecipientMutation: vi.fn(),
      };
    },
  },
}));

import {
  COMMERCIAL_INVITATIONS_LIST_TAG,
} from '@/features/commercial-invitation/api/commercial-invitations-api';

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

  it('garde le secret dans le body de tous les endpoints bénéficiaire', () => {
    const preview = captured.mutations[3];
    const registerRecipient = captured.mutations[4];
    const verifyRecipient = captured.mutations[5];
    const accept = captured.mutations[6];
    const decline = captured.mutations[7];
    const token = 'a'.repeat(64);
    const credentials = {
      firstName: 'Beta',
      lastName: 'User',
      email: 'beta@example.com',
      password: 'long-password-for-test',
    };

    expect(preview.query(token)).toEqual({
      url: '/commercial-invitations/preview',
      method: 'POST',
      body: { token },
    });
    expect(registerRecipient.query({ token, ...credentials })).toEqual({
      url: '/commercial-invitations/register',
      method: 'POST',
      body: { ...credentials, token },
    });
    expect(verifyRecipient.query(token)).toEqual({
      url: '/commercial-invitations/recipient',
      method: 'POST',
      body: { token },
    });
    expect(accept.query(token)).toEqual({
      url: '/commercial-invitations/accept',
      method: 'POST',
      body: { token },
    });
    expect(decline.query(token)).toEqual({
      url: '/commercial-invitations/decline',
      method: 'POST',
      body: { token },
    });
  });

  it('rafraîchit le listing Platform après acceptation', () => {
    const accept = captured.mutations[6];

    expect(accept.invalidatesTags).toContain(COMMERCIAL_INVITATIONS_LIST_TAG);
  });
});
