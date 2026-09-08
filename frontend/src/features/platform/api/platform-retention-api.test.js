import { describe, expect, it, vi } from 'vitest';

const captured = vi.hoisted(() => ({
  mutationConfigs: [],
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
        mutation: vi.fn((config) => {
          captured.mutationConfigs.push(config);
          return config;
        }),
      };

      endpoints(builder);

      return {
        useCreatePlatformRetentionPolicyVersionMutation: vi.fn(),
        useExecutePlatformRetentionMutation: vi.fn(),
        useGetPlatformRetentionExecutionsQuery: vi.fn(),
        useGetPlatformRetentionStateQuery: vi.fn(),
        useGetPlatformRetentionTargetsQuery: vi.fn(),
        usePreviewPlatformRetentionMutation: vi.fn(),
      };
    },
  },
}));

import '@/features/platform/api/platform-retention-api';

describe('platformRetentionApi', () => {
  it('lit les cibles, l’état et l’historique depuis les routes Platform dédiées', () => {
    expect(captured.queryConfigs[0].query()).toBe('/platform/retention');
    expect(captured.queryConfigs[1].query('audit_log')).toBe(
      '/platform/retention/audit_log',
    );
    expect(captured.queryConfigs[2].query({
      targetKey: 'audit_log',
      page: 2,
      limit: 20,
    })).toEqual({
      url: '/platform/retention/audit_log/executions',
      params: { page: 2, limit: 20 },
    });

    expect(captured.queryConfigs[2].transformResponse({
      data: { executions: [] },
      meta: { page: 2, limit: 20, total: 41, pages: 3 },
    })).toEqual({
      executions: [],
      pagination: {
        page: 2,
        limit: 20,
        total: 41,
        pages: 3,
        totalPages: 3,
      },
    });
  });

  it('n’envoie aucun cutoff ni filtre dans la preview', () => {
    expect(captured.mutationConfigs[0].query('audit_log')).toEqual({
      url: '/platform/retention/audit_log/preview',
      method: 'POST',
    });
  });

  it('transmet uniquement le body contrôlé aux écritures et invalide les caches concernés', () => {
    const policyBody = {
      expectedVersion: 2,
      enabled: true,
      retentionDays: 365,
      batchSize: 100,
      maxBatchesPerRun: 10,
      schedule: { intervalMinutes: 1440 },
      manualExecutionEnabled: true,
    };
    const executionBody = {
      expectedPolicyVersion: 2,
      expectedEligibleCount: 50,
      expectedMaxAffectedThisRun: 50,
      confirmation: 'PURGE_AUDIT_LOG_V2',
    };

    expect(captured.mutationConfigs[1].query({
      targetKey: 'audit_log',
      body: policyBody,
    })).toEqual({
      url: '/platform/retention/audit_log/policy-versions',
      method: 'POST',
      body: policyBody,
    });

    expect(captured.mutationConfigs[2].query({
      targetKey: 'audit_log',
      body: executionBody,
    })).toEqual({
      url: '/platform/retention/audit_log/executions',
      method: 'POST',
      body: executionBody,
    });

    expect(captured.mutationConfigs[2].invalidatesTags(
      null,
      null,
      { targetKey: 'audit_log' },
    )).toEqual([
      { type: 'PlatformRetentionState', id: 'audit_log' },
      { type: 'PlatformRetentionExecutions', id: 'audit_log' },
      'PlatformAuditLogs',
    ]);
  });
});
