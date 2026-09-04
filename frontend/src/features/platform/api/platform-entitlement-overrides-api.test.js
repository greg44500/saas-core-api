import { describe, expect, it, vi } from 'vitest';

const captured = vi.hoisted(() => ({ queries: [], mutations: [] }));

vi.mock('@/services/api/base-api', () => ({
  baseApi: {
    injectEndpoints: ({ endpoints }) => {
      const builder = {
        query: (config) => {
          captured.queries.push(config);
          return config;
        },
        mutation: (config) => {
          captured.mutations.push(config);
          return config;
        },
      };
      endpoints(builder);
      return {
        useCreatePlatformEntitlementOverrideMutation: vi.fn(),
        useGetPlatformEntitlementOverrideQuery: vi.fn(),
        useListPlatformEntitlementOverridesQuery: vi.fn(),
        useRevokePlatformEntitlementOverrideMutation: vi.fn(),
        useUpdatePlatformEntitlementOverrideMutation: vi.fn(),
      };
    },
  },
}));

import '@/features/platform/api/platform-entitlement-overrides-api';

describe('platformEntitlementOverridesApi', () => {
  it('conserve le contrat de liste et de mutation F10.4', () => {
    expect(captured.queries[0].query({ page: 2, limit: 20, targetType: 'feature' })).toEqual({
      url: '/platform/entitlement-overrides',
      params: { page: 2, limit: 20, targetType: 'feature' },
    });

    expect(captured.queries[1].query('override-id')).toBe(
      '/platform/entitlement-overrides/override-id',
    );

    expect(captured.mutations[0].query({ reason: 'Support', source: 'support' })).toEqual({
      url: '/platform/entitlement-overrides',
      method: 'POST',
      body: { reason: 'Support', source: 'support' },
    });

    expect(captured.mutations[1].query({ overrideId: 'override-id', reason: 'Mise à jour' })).toEqual({
      url: '/platform/entitlement-overrides/override-id',
      method: 'PATCH',
      body: { reason: 'Mise à jour' },
    });

    expect(captured.mutations[2].query({ overrideId: 'override-id', reason: 'Révocation' })).toEqual({
      url: '/platform/entitlement-overrides/override-id/revoke',
      method: 'PATCH',
      body: { reason: 'Révocation' },
    });
  });
});
