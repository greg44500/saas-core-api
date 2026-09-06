import { describe, expect, it, vi } from 'vitest';

const captured = vi.hoisted(() => ({
  queryConfigs: [],
}));

vi.mock('@/services/api/base-api', () => ({
  baseApi: {
    injectEndpoints: ({ endpoints }) => {
      const builder = {
        query: vi.fn((config) => {
          captured.queryConfigs.push(config);
          return config;
        }),
      };

      endpoints(builder);

      return {
        useGetPlatformAuditMetadataQuery: vi.fn(),
        useListPlatformAuditLogsQuery: vi.fn(),
      };
    },
  },
}));

vi.mock('@/features/audit-log/api/audit-log-api', () => ({
  compactQueryParams: (params) => Object.fromEntries(
    Object.entries(params).filter(([, value]) => (
      value !== undefined && value !== null && value !== ''
    )),
  ),
}));

import '@/features/platform/api/platform-audit-logs-api';

describe('platformAuditLogsApi', () => {
  it('charge le catalogue Audit depuis le backend sans mapping frontend', () => {
    const metadataConfig = captured.queryConfigs[0];

    expect(metadataConfig.query()).toBe('/platform/audit-logs/metadata');

    const metadata = {
      actions: [{ value: 'CUSTOM_ACTION', label: 'Action métier ajoutée' }],
      entityTypes: [{ value: 'CustomEntity', label: 'Ressource métier ajoutée' }],
      statuses: [{ value: 'success', label: 'Réussie' }],
    };

    expect(metadataConfig.transformResponse({
      data: { metadata },
    })).toEqual(metadata);
  });

  it('conserve le contrat de liste filtrée des journaux', () => {
    const listConfig = captured.queryConfigs[1];

    expect(listConfig.query({
      page: 2,
      limit: 20,
      entityType: 'EntitlementOverride',
      action: 'ENTITLEMENT_OVERRIDE_REVOKED',
      status: 'success',
    })).toEqual({
      url: '/platform/audit-logs',
      params: {
        page: 2,
        limit: 20,
        entityType: 'EntitlementOverride',
        action: 'ENTITLEMENT_OVERRIDE_REVOKED',
        status: 'success',
      },
    });
  });
});
