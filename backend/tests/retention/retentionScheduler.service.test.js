import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

const {
    acquireLockMock,
    executeWithLeaseMock,
    findOneExecutionMock,
    getCurrentPolicyMock,
    markInterruptedMock,
    normalizePolicyMock,
    releaseLockMock,
} = vi.hoisted(() => ({
    acquireLockMock: vi.fn(),
    executeWithLeaseMock: vi.fn(),
    findOneExecutionMock: vi.fn(),
    getCurrentPolicyMock: vi.fn(),
    markInterruptedMock: vi.fn(),
    normalizePolicyMock: vi.fn(),
    releaseLockMock: vi.fn(),
}));

vi.mock('../../config/applicationRetention.registry.js', () => ({
    ACTIVE_RETENTION_TARGET_REGISTRY: {
        definitions: [
            {
                key: 'audit_log',
                capabilities: ['preview', 'scheduled_execution', 'manual_execution'],
            },
        ],
        getTargetDefinition(targetKey) {
            return targetKey === 'audit_log'
                ? this.definitions[0]
                : null;
        },
    },
}));

vi.mock('../../modules/retention/retentionPolicyRead.service.js', () => ({
    getCurrentRetentionPolicy: getCurrentPolicyMock,
}));

vi.mock('../../modules/retention/retentionLock.service.js', () => ({
    acquireRetentionLock: acquireLockMock,
    releaseRetentionLock: releaseLockMock,
}));

vi.mock('../../modules/retention/retentionEngine.service.js', () => ({
    executeRetentionPolicyWithLease: executeWithLeaseMock,
    markInterruptedRetentionExecutions: markInterruptedMock,
    normalizeRetentionPolicy: normalizePolicyMock,
}));

vi.mock('../../modules/retention/retentionExecution.model.js', () => ({
    RetentionExecution: {
        findOne: findOneExecutionMock,
    },
}));

import {
    runScheduledRetentionPolicies,
    runScheduledRetentionTarget,
} from '../../modules/retention/retentionScheduler.service.js';

const policy = {
    _id: 'policy-id',
    version: 1,
    config: {
        targetKey: 'audit_log',
        enabled: true,
        schedule: {
            intervalMinutes: 60,
        },
    },
};

const lease = {
    targetKey: 'audit_log',
    leaseId: 'lease-id',
    holderId: 'worker-a',
};

const createLastExecutionQuery = (result) => ({
    sort: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(result),
});

beforeEach(() => {
    vi.clearAllMocks();
    acquireLockMock.mockResolvedValue(lease);
    releaseLockMock.mockResolvedValue(true);
    markInterruptedMock.mockResolvedValue(0);
    normalizePolicyMock.mockImplementation((value) => value);
    executeWithLeaseMock.mockResolvedValue({
        execution: {
            _id: 'execution-id',
        },
    });
});

describe('retentionScheduler.service', () => {
    it('recalcule l’échéance sous lock et n’exécute pas trop tôt', async () => {
        getCurrentPolicyMock
            .mockResolvedValueOnce(policy)
            .mockResolvedValueOnce(policy);
        findOneExecutionMock.mockReturnValue(
            createLastExecutionQuery({
                startedAt: new Date('2026-09-08T09:30:00.000Z'),
            }),
        );

        const result = await runScheduledRetentionTarget({
            targetKey: 'audit_log',
            holderId: 'worker-a',
            now: new Date('2026-09-08T10:00:00.000Z'),
            clock: () => new Date('2026-09-08T10:00:01.000Z'),
        });

        expect(markInterruptedMock).toHaveBeenCalledOnce();
        expect(executeWithLeaseMock).not.toHaveBeenCalled();
        expect(releaseLockMock).toHaveBeenCalledOnce();
        expect(result).toEqual({
            targetKey: 'audit_log',
            status: 'not_due',
            nextScheduledAt: new Date('2026-09-08T10:30:00.000Z'),
        });
    });

    it('retente au prochain passage après une exécution échouée', async () => {
        getCurrentPolicyMock
            .mockResolvedValueOnce(policy)
            .mockResolvedValueOnce(policy);
        findOneExecutionMock.mockReturnValue(
            createLastExecutionQuery(null),
        );

        const result = await runScheduledRetentionTarget({
            targetKey: 'audit_log',
            holderId: 'worker-a',
            now: new Date('2026-09-08T10:00:00.000Z'),
            clock: () => new Date('2026-09-08T10:00:01.000Z'),
        });

        expect(findOneExecutionMock).toHaveBeenCalledWith({
            policy: 'policy-id',
            trigger: 'scheduled',
            status: 'succeeded',
        });
        expect(executeWithLeaseMock).toHaveBeenCalledOnce();
        expect(result.status).toBe('executed');
    });

    it('exécute immédiatement une nouvelle policy planifiée sans historique', async () => {
        getCurrentPolicyMock
            .mockResolvedValueOnce(policy)
            .mockResolvedValueOnce(policy);
        findOneExecutionMock.mockReturnValue(
            createLastExecutionQuery(null),
        );

        const result = await runScheduledRetentionTarget({
            targetKey: 'audit_log',
            holderId: 'worker-a',
            now: new Date('2026-09-08T10:00:00.000Z'),
            clock: () => new Date('2026-09-08T10:00:01.000Z'),
        });

        expect(executeWithLeaseMock).toHaveBeenCalledWith({
            policy,
            lease,
            trigger: 'scheduled',
            initiatedBy: null,
            now: new Date('2026-09-08T10:00:00.000Z'),
            clock: expect.any(Function),
        });
        expect(result).toEqual({
            targetKey: 'audit_log',
            status: 'executed',
            executionId: 'execution-id',
        });
    });

    it('ne démarre rien lorsqu’une autre instance détient la target', async () => {
        getCurrentPolicyMock.mockResolvedValue(policy);
        acquireLockMock.mockResolvedValue(null);

        const result = await runScheduledRetentionTarget({
            targetKey: 'audit_log',
            holderId: 'worker-b',
            now: new Date('2026-09-08T10:00:00.000Z'),
        });

        expect(result).toEqual({
            targetKey: 'audit_log',
            status: 'locked',
        });
        expect(executeWithLeaseMock).not.toHaveBeenCalled();
        expect(releaseLockMock).not.toHaveBeenCalled();
    });

    it('retourne une synthèse bornée et signale les erreurs par target', async () => {
        getCurrentPolicyMock.mockResolvedValue(policy);
        acquireLockMock.mockResolvedValue(lease);
        findOneExecutionMock.mockReturnValue(
            createLastExecutionQuery(null),
        );
        executeWithLeaseMock.mockRejectedValue(
            new Error('adapter failure'),
        );

        const result = await runScheduledRetentionPolicies({
            holderId: 'worker-a',
            now: new Date('2026-09-08T10:00:00.000Z'),
            clock: () => new Date('2026-09-08T10:00:01.000Z'),
        });

        expect(result).toEqual({
            targets: 1,
            executed: 0,
            failed: 1,
            results: [
                {
                    targetKey: 'audit_log',
                    status: 'failed',
                },
            ],
        });
    });
});
