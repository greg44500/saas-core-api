import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

const {
    executeRetentionPolicyMock,
    getCurrentRetentionPolicyMock,
    previewRetentionPolicyMock,
} = vi.hoisted(() => ({
    executeRetentionPolicyMock: vi.fn(),
    getCurrentRetentionPolicyMock: vi.fn(),
    previewRetentionPolicyMock: vi.fn(),
}));

vi.mock(
    '../../../modules/retention/retentionEngine.service.js',
    () => ({
        executeRetentionPolicy: executeRetentionPolicyMock,
        previewRetentionPolicy: previewRetentionPolicyMock,
    }),
);

vi.mock(
    '../../../modules/retention/retentionPolicyRead.service.js',
    () => ({
        getCurrentRetentionPolicy:
            getCurrentRetentionPolicyMock,
    }),
);

import {
    buildManualRetentionConfirmationPhrase,
    executePlatformRetentionPolicyManually,
    previewPlatformRetentionPolicy,
} from '../../../modules/platform/retention/services/platformRetentionExecution.service.js';

const policy = {
    _id: 'policy-id',
    version: 3,
    config: {
        schemaVersion: 1,
        targetKey: 'audit_log',
        enabled: true,
        retentionDays: 365,
        batchSize: 100,
        maxBatchesPerRun: 10,
        schedule: {
            intervalMinutes: 1440,
        },
        manualExecutionEnabled: true,
    },
};

const preview = {
    policyId: 'policy-id',
    policyVersion: 3,
    targetKey: 'audit_log',
    cutoffAt: new Date('2025-09-08T10:00:00.000Z'),
    eligibleCount: 42,
    batchSize: 100,
    maxBatchesPerRun: 10,
    estimatedBatches: 1,
    maxAffectedThisRun: 42,
    truncated: false,
};

beforeEach(() => {
    vi.clearAllMocks();
    getCurrentRetentionPolicyMock.mockResolvedValue(policy);
    previewRetentionPolicyMock.mockResolvedValue(preview);
});


describe('platformRetentionExecution service', () => {
    it('retourne une confirmation liée à la version et à l’impact de la preview', async () => {
        const result = await previewPlatformRetentionPolicy({
            targetKey: 'audit_log',
            now: new Date('2026-09-08T10:00:00.000Z'),
        });

        expect(result.confirmation).toEqual({
            phrase: 'PURGE_AUDIT_LOG_V3',
            expectedPolicyVersion: 3,
            expectedEligibleCount: 42,
            expectedMaxAffectedThisRun: 42,
        });
    });

    it('refuse une confirmation fondée sur une policy devenue obsolète', async () => {
        await expect(
            executePlatformRetentionPolicyManually({
                targetKey: 'audit_log',
                expectedPolicyVersion: 2,
                expectedEligibleCount: 42,
                expectedMaxAffectedThisRun: 42,
                confirmation: 'PURGE_AUDIT_LOG_V2',
                actorId: 'actor-id',
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(previewRetentionPolicyMock)
            .not.toHaveBeenCalled();
        expect(executeRetentionPolicyMock)
            .not.toHaveBeenCalled();
    });

    it('refuse si l’impact a changé depuis la preview', async () => {
        previewRetentionPolicyMock.mockResolvedValue({
            ...preview,
            eligibleCount: 43,
            maxAffectedThisRun: 43,
        });

        await expect(
            executePlatformRetentionPolicyManually({
                targetKey: 'audit_log',
                expectedPolicyVersion: 3,
                expectedEligibleCount: 42,
                expectedMaxAffectedThisRun: 42,
                confirmation: 'PURGE_AUDIT_LOG_V3',
                actorId: 'actor-id',
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(executeRetentionPolicyMock)
            .not.toHaveBeenCalled();
    });

    it('refuse une phrase de confirmation invalide avant toute destruction', async () => {
        await expect(
            executePlatformRetentionPolicyManually({
                targetKey: 'audit_log',
                expectedPolicyVersion: 3,
                expectedEligibleCount: 42,
                expectedMaxAffectedThisRun: 42,
                confirmation: 'CONFIRM',
                actorId: 'actor-id',
            }),
        ).rejects.toMatchObject({
            statusCode: 400,
        });

        expect(previewRetentionPolicyMock)
            .not.toHaveBeenCalled();
        expect(executeRetentionPolicyMock)
            .not.toHaveBeenCalled();
    });

    it('exécute uniquement avec la version, l’impact et l’acteur confirmés', async () => {
        executeRetentionPolicyMock.mockResolvedValue({
            executed: true,
            execution: {
                _id: 'execution-id',
                policy: 'policy-id',
                policyVersion: 3,
                policySnapshot: {
                    targetKey: 'audit_log',
                },
                trigger: 'manual',
                initiatedBy: 'actor-id',
                startedAt: new Date('2026-09-08T10:00:00.000Z'),
                cutoffAt: preview.cutoffAt,
                status: 'succeeded',
                finishedAt: new Date('2026-09-08T10:00:02.000Z'),
                counters: {
                    selected: 42,
                    processed: 42,
                    affected: 42,
                    skipped: 0,
                    failed: 0,
                },
                batchesProcessed: 1,
                lease: {
                    acquiredAt: new Date('2026-09-08T10:00:00.000Z'),
                    expiresAt: new Date('2026-09-08T10:05:00.000Z'),
                },
                errorCode: null,
            },
        });

        const now = new Date('2026-09-08T10:00:00.000Z');
        const result = await executePlatformRetentionPolicyManually({
            targetKey: 'audit_log',
            expectedPolicyVersion: 3,
            expectedEligibleCount: 42,
            expectedMaxAffectedThisRun: 42,
            confirmation:
                buildManualRetentionConfirmationPhrase({
                    targetKey: 'audit_log',
                    policyVersion: 3,
                }),
            actorId: 'actor-id',
            now,
        });

        expect(executeRetentionPolicyMock)
            .toHaveBeenCalledWith(expect.objectContaining({
                policy,
                trigger: 'manual',
                initiatedBy: 'actor-id',
                now,
                holderId: expect.stringMatching(
                    /^platform-api:actor-id:/,
                ),
            }));
        expect(result.execution.status).toBe('succeeded');
    });

    it('traduit un lock concurrent en conflit HTTP contrôlé', async () => {
        executeRetentionPolicyMock.mockResolvedValue({
            executed: false,
            reason: 'locked',
        });

        await expect(
            executePlatformRetentionPolicyManually({
                targetKey: 'audit_log',
                expectedPolicyVersion: 3,
                expectedEligibleCount: 42,
                expectedMaxAffectedThisRun: 42,
                confirmation: 'PURGE_AUDIT_LOG_V3',
                actorId: 'actor-id',
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });
    });
});
