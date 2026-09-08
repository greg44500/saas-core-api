import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';

import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';

const mocks = vi.hoisted(() => ({
  createPolicyVersion: vi.fn(),
  executeRetention: vi.fn(),
  platformContext: vi.fn(),
  previewRetention: vi.fn(),
  retentionExecutions: vi.fn(),
  retentionState: vi.fn(),
  retentionTargets: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/components/shared/toast-provider', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/features/platform/api/platform-current-context-api', () => ({
  useGetCurrentPlatformContextQuery: mocks.platformContext,
}));

vi.mock('@/features/platform/api/platform-retention-api', () => ({
  useCreatePlatformRetentionPolicyVersionMutation: () => [
    mocks.createPolicyVersion,
    { isLoading: false },
  ],
  useExecutePlatformRetentionMutation: () => [
    mocks.executeRetention,
    { isLoading: false },
  ],
  useGetPlatformRetentionExecutionsQuery: mocks.retentionExecutions,
  useGetPlatformRetentionStateQuery: mocks.retentionState,
  useGetPlatformRetentionTargetsQuery: mocks.retentionTargets,
  usePreviewPlatformRetentionMutation: () => [
    mocks.previewRetention,
    { isLoading: false },
  ],
}));

vi.mock('@/features/platform/components/platform-retention-policy-form', () => ({
  PlatformRetentionPolicyForm: ({ disabled, onSubmit }) => (
    <div>
      <span>policy-disabled:{String(disabled)}</span>
      <button
        onClick={() => onSubmit({
          expectedVersion: 2,
          enabled: true,
          retentionDays: 365,
          batchSize: 100,
          maxBatchesPerRun: 10,
          schedule: null,
          manualExecutionEnabled: true,
        })}
        type="button"
      >
        Save test policy
      </button>
    </div>
  ),
}));

vi.mock('@/features/platform/components/platform-retention-preview', () => ({
  PlatformRetentionPreview: ({
    canExecute,
    canPreview,
    onExecute,
    onPreview,
    preview,
  }) => (
    <div>
      <span>can-preview:{String(canPreview)}</span>
      <span>can-execute:{String(canExecute)}</span>
      <span>preview-ready:{String(Boolean(preview))}</span>
      <button onClick={onPreview} type="button">Preview test</button>
      <button onClick={() => onExecute('PURGE_AUDIT_LOG_V2')} type="button">
        Execute test
      </button>
    </div>
  ),
}));

vi.mock('@/features/platform/components/platform-retention-executions-table', () => ({
  PlatformRetentionExecutionsTable: ({ executions }) => (
    <div>executions:{executions.length}</div>
  ),
}));

import { PlatformRetentionPage } from '@/features/platform/pages/platform-retention-page';

const target = {
  key: 'audit_log',
  label: 'Journaux d’audit',
  description: 'Rétention des AuditLogs',
  bounds: {
    retentionDays: { min: 1, max: 36500 },
    batchSize: { min: 1, max: 500 },
    maxBatchesPerRun: { min: 1, max: 100 },
    scheduleIntervalMinutes: { min: 60, max: 525600 },
  },
};

const policy = {
  id: 'policy-id',
  version: 2,
  config: {
    enabled: true,
    retentionDays: 365,
    batchSize: 100,
    maxBatchesPerRun: 10,
    schedule: null,
    manualExecutionEnabled: true,
  },
  createdAt: '2026-09-08T10:00:00.000Z',
};

const preview = {
  policyVersion: 2,
  eligibleCount: 12,
  maxAffectedThisRun: 12,
  confirmation: {
    phrase: 'PURGE_AUDIT_LOG_V2',
    expectedPolicyVersion: 2,
    expectedEligibleCount: 12,
    expectedMaxAffectedThisRun: 12,
  },
};

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/platform/retention']}>
      <PlatformRetentionPage />
    </MemoryRouter>,
  );
}

function setPermissions(permissions) {
  mocks.platformContext.mockReturnValue({
    data: {
      status: 'active',
      permissions,
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();

  setPermissions([
    PLATFORM_PERMISSION.RETENTION_READ,
    PLATFORM_PERMISSION.RETENTION_PREVIEW,
    PLATFORM_PERMISSION.RETENTION_UPDATE,
    PLATFORM_PERMISSION.RETENTION_EXECUTE,
  ]);

  mocks.retentionTargets.mockReturnValue({
    data: [{ target, currentPolicy: policy }],
    isLoading: false,
    refetch: vi.fn().mockResolvedValue({}),
  });
  mocks.retentionState.mockReturnValue({
    data: {
      target,
      currentPolicy: policy,
      latestExecution: null,
      runtime: { locked: false, lockExpiresAt: null },
    },
    isFetching: false,
    refetch: vi.fn().mockResolvedValue({}),
  });
  mocks.retentionExecutions.mockReturnValue({
    data: {
      executions: [],
      pagination: { page: 1, totalPages: 1 },
    },
    isFetching: false,
    refetch: vi.fn().mockResolvedValue({}),
  });
  mocks.previewRetention.mockReturnValue({
    unwrap: vi.fn().mockResolvedValue(preview),
  });
  mocks.createPolicyVersion.mockReturnValue({
    unwrap: vi.fn().mockResolvedValue({ version: 3 }),
  });
  mocks.executeRetention.mockReturnValue({
    unwrap: vi.fn().mockResolvedValue({
      execution: { counters: { affected: 12 } },
    }),
  });
});

afterEach(() => cleanup());

describe('PlatformRetentionPage', () => {
  it('projette les permissions d’action sans remplacer l’autorité backend', () => {
    renderPage();

    expect(screen.getByText('policy-disabled:false')).toBeInTheDocument();
    expect(screen.getByText('can-preview:true')).toBeInTheDocument();
    expect(screen.getByText('can-execute:true')).toBeInTheDocument();
  });

  it('reste en lecture seule sans les permissions sensibles ou réservées', () => {
    setPermissions([PLATFORM_PERMISSION.RETENTION_READ]);
    renderPage();

    expect(screen.getByText('policy-disabled:true')).toBeInTheDocument();
    expect(screen.getByText('can-preview:false')).toBeInTheDocument();
    expect(screen.getByText('can-execute:false')).toBeInTheDocument();
  });

  it('orchestre policy, preview puis exécution avec les gardes backend uniquement', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Save test policy' }));
    expect(mocks.createPolicyVersion).toHaveBeenCalledWith({
      targetKey: 'audit_log',
      body: {
        expectedVersion: 2,
        enabled: true,
        retentionDays: 365,
        batchSize: 100,
        maxBatchesPerRun: 10,
        schedule: null,
        manualExecutionEnabled: true,
      },
    });

    await user.click(screen.getByRole('button', { name: 'Preview test' }));
    expect(mocks.previewRetention).toHaveBeenCalledWith('audit_log');

    await waitFor(() => {
      expect(screen.getByText('preview-ready:true')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Execute test' }));

    expect(mocks.executeRetention).toHaveBeenCalledWith({
      targetKey: 'audit_log',
      body: {
        expectedPolicyVersion: 2,
        expectedEligibleCount: 12,
        expectedMaxAffectedThisRun: 12,
        confirmation: 'PURGE_AUDIT_LOG_V2',
      },
    });
    expect(mocks.executeRetention.mock.calls[0][0].body)
      .not.toHaveProperty('cutoffAt');
  });
});
