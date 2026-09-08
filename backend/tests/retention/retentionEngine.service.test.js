import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

const {
    acquireLockMock,
    adapterExecuteBatchMock,
    adapterPreviewMock,
    executionFindMock,
    executionInstances,
    releaseLockMock,
    renewLockMock,
} = vi.hoisted(() => ({
    acquireLockMock: vi.fn(),
    adapterExecuteBatchMock: vi.fn(),
    adapterPreviewMock: vi.fn(),
    executionFindMock: vi.fn(),
    executionInstances: [],
    releaseLockMock: vi.fn(),
    renewLockMock: vi.fn(),
}));

vi.mock('../../config/applicationRetention.registry.js', () => ({
    ACTIVE_RETENTION_ADAPTER_REGISTRY: {
        getAdapter(targetKey) {
            if (targetKey !== 'audit_log') return null;
            return {
                preview: adapterPreviewMock,
                executeBatch: adapterExecuteBatchMock,
            };
        },
    },
}));

vi.mock('../../modules/retention/retentionPolicy.validation.js', () => ({
    validateRetentionPolicyConfig(input) {
        return {
            success: true,
            data: input,
        };
    },
}));

vi.mock('../../modules/retention/retentionLock.service.js', () => ({
    acquireRetentionLock: acquireLockMock,
    releaseRetentionLock: releaseLockMock,
    renewRetentionLock: renewLockMock,
}));

vi.mock('../../modules/retention/retentionExecution.model.js', () => {
    class RetentionExecution {
        constructor(data) {
            Object.assign(this, data);
            this._id = `execution-${executionInstances.length + 1}`;
            this.status = data.status ?? 'running';
            this.finishedAt = data.finishedAt ?? null;
            this.errorCode = data.errorCode ?? null;
            this.counters = {
                selected: 0,
                processed: 0,
                affected: 0,
                skipped: 0,
                failed: 0,
                ...(data.counters ?? {}),
            };
            this.batchesProcessed = data.batchesProcessed ?? 0;
            this.save = vi.fn().mockResolvedValue(this);
            executionInstances.push(this);
        }

        static find(...args) {
            return executionFindMock(...args);
        }
    }

    return { RetentionExecution };
});

import {
    RETENTION_EXECUTION_ERROR_CODE,
    RETENTION_EXECUTION_TRIGGER,
} from '../../constants/retention.constants.js';
import {
    executeRetentionPolicy,
    markInterruptedRetentionExecutions,
    previewRetentionPolicy,
} from '../../modules/retention/retentionEngine.service.js';

const createPolicy = (overrides = {}) => ({
    _id: 'policy-id',
    version: 3,
    config: {
        schemaVersion: 1,
        targetKey: 'audit_log',
        enabled: true,
        retentionDays: 30,
        batchSize: 2,
        maxBatchesPerRun: 2,
        schedule: {
            intervalMinutes: 60,
        },
        manualExecutionEnabled: true,
        ...overrides,
    },
});

const createLease = () => ({
    targetKey: 'audit_log',
    leaseId: '123e4567-e89b-42d3-a456-426614174000',
    holderId: 'worker-a',
    acquiredAt: new Date('2026-09-08T10:00:00.000Z'),
    expiresAt: new Date('2026-09-08T10:05:00.000Z'),
});

const emptyRunningExecutions = () => ({
    sort: vi.fn().mockResolvedValue([]),
});

beforeEach(() => {
    vi.clearAllMocks();
    executionInstances.length = 0;
    executionFindMock.mockReturnValue(emptyRunningExecutions());
    releaseLockMock.mockResolvedValue(true);
});

describe('retentionEngine.service', () => {
    it('prévisualise sans supprimer et borne le volume d’un run', async () => {
        const now = new Date('2026-09-08T10:00:00.000Z');
        adapterPreviewMock.mockResolvedValue({
            eligibleCount: 9,
        });

        const result = await previewRetentionPolicy({
            policy: createPolicy(),
            now,
        });

        expect(adapterExecuteBatchMock).not.toHaveBeenCalled();
        expect(adapterPreviewMock).toHaveBeenCalledWith({
            cutoffAt: new Date('2026-08-09T10:00:00.000Z'),
        });
        expect(result).toEqual({
            policyId: 'policy-id',
            policyVersion: 3,
            targetKey: 'audit_log',
            cutoffAt: new Date('2026-08-09T10:00:00.000Z'),
            eligibleCount: 9,
            batchSize: 2,
            maxBatchesPerRun: 2,
            estimatedBatches: 2,
            maxAffectedThisRun: 4,
            truncated: true,
        });
    });

    it('respecte strictement batchSize et maxBatchesPerRun', async () => {
        const lease = createLease();
        acquireLockMock.mockResolvedValue(lease);
        renewLockMock.mockResolvedValue(lease);
        adapterExecuteBatchMock.mockResolvedValue({
            selected: 2,
            processed: 2,
            affected: 2,
            skipped: 0,
            failed: 0,
        });

        const result = await executeRetentionPolicy({
            policy: createPolicy(),
            trigger: RETENTION_EXECUTION_TRIGGER.SCHEDULED,
            holderId: 'worker-a',
            now: new Date('2026-09-08T10:00:00.000Z'),
            clock: () => new Date('2026-09-08T10:01:00.000Z'),
        });

        expect(adapterExecuteBatchMock).toHaveBeenCalledTimes(2);
        expect(adapterExecuteBatchMock).toHaveBeenNthCalledWith(1, {
            cutoffAt: new Date('2026-08-09T10:00:00.000Z'),
            batchSize: 2,
        });
        expect(renewLockMock).toHaveBeenCalledTimes(4);
        expect(releaseLockMock).toHaveBeenCalledOnce();

        const execution = executionInstances[0];
        expect(execution.status).toBe('succeeded');
        expect(execution.batchesProcessed).toBe(2);
        expect(execution.counters).toEqual({
            selected: 4,
            processed: 4,
            affected: 4,
            skipped: 0,
            failed: 0,
        });
        expect(result.executed).toBe(true);
    });

    it('échoue fermé dès que la lease est perdue', async () => {
        const lease = createLease();
        acquireLockMock.mockResolvedValue(lease);
        renewLockMock.mockResolvedValueOnce(null);

        await expect(
            executeRetentionPolicy({
                policy: createPolicy(),
                trigger: RETENTION_EXECUTION_TRIGGER.SCHEDULED,
                holderId: 'worker-a',
                now: new Date('2026-09-08T10:00:00.000Z'),
                clock: () => new Date('2026-09-08T10:01:00.000Z'),
            }),
        ).rejects.toThrow(
            'Retention lock ownership was lost',
        );

        expect(adapterExecuteBatchMock).not.toHaveBeenCalled();
        expect(releaseLockMock).toHaveBeenCalledOnce();

        const execution = executionInstances[0];
        expect(execution.status).toBe('failed');
        expect(execution.errorCode).toBe(
            RETENTION_EXECUTION_ERROR_CODE.LOCK_LOST,
        );
    });

    it('ferme durablement un ancien RUNNING après reprise du lock', async () => {
        const staleExecution = {
            startedAt: new Date('2026-09-08T09:00:00.000Z'),
            status: 'running',
            finishedAt: null,
            errorCode: null,
            save: vi.fn().mockResolvedValue(undefined),
        };
        executionFindMock.mockReturnValue({
            sort: vi.fn().mockResolvedValue([staleExecution]),
        });

        const interrupted = await markInterruptedRetentionExecutions({
            targetKey: 'audit_log',
            now: new Date('2026-09-08T10:00:00.000Z'),
        });

        expect(interrupted).toBe(1);
        expect(staleExecution.status).toBe('failed');
        expect(staleExecution.errorCode).toBe(
            RETENTION_EXECUTION_ERROR_CODE.INTERRUPTED,
        );
        expect(staleExecution.finishedAt).toEqual(
            new Date('2026-09-08T10:00:00.000Z'),
        );
        expect(staleExecution.save).toHaveBeenCalledOnce();
    });
});
