import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

const {
    countDocumentsMock,
    executionFindMock,
    executionFindOneMock,
    getCurrentRetentionPolicyMock,
    lockFindOneMock,
} = vi.hoisted(() => ({
    countDocumentsMock: vi.fn(),
    executionFindMock: vi.fn(),
    executionFindOneMock: vi.fn(),
    getCurrentRetentionPolicyMock: vi.fn(),
    lockFindOneMock: vi.fn(),
}));

vi.mock('mongoose', () => ({
    default: {
        trusted: (value) => value,
    },
}));

vi.mock(
    '../../../modules/retention/retentionExecution.model.js',
    () => ({
        RetentionExecution: {
            find: executionFindMock,
            findOne: executionFindOneMock,
            countDocuments: countDocumentsMock,
        },
    }),
);

vi.mock(
    '../../../modules/retention/retentionLock.model.js',
    () => ({
        RetentionLock: {
            findOne: lockFindOneMock,
        },
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
    getPlatformRetentionState,
    listPlatformRetentionExecutions,
} from '../../../modules/platform/retention/services/platformRetentionRead.service.js';

const createOneQuery = (result) => ({
    sort: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(result),
});

const createListQuery = (result) => ({
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(result),
});

beforeEach(() => {
    vi.clearAllMocks();
});


describe('platformRetentionRead service', () => {
    it('expose un état runtime sans leaseId ni holderId', async () => {
        getCurrentRetentionPolicyMock.mockResolvedValue({
            _id: 'policy-id',
            version: 2,
            config: {
                targetKey: 'audit_log',
            },
            createdBy: 'actor-id',
        });
        executionFindOneMock.mockReturnValue(
            createOneQuery({
                _id: 'execution-id',
                policy: 'policy-id',
                policyVersion: 2,
                policySnapshot: {
                    targetKey: 'audit_log',
                },
                trigger: 'scheduled',
                initiatedBy: null,
                startedAt: new Date('2026-09-08T08:00:00.000Z'),
                cutoffAt: new Date('2025-09-08T08:00:00.000Z'),
                status: 'succeeded',
                finishedAt: new Date('2026-09-08T08:00:01.000Z'),
                counters: {
                    selected: 1,
                    processed: 1,
                    affected: 1,
                    skipped: 0,
                    failed: 0,
                },
                batchesProcessed: 1,
                lease: {
                    leaseId: 'secret-lease-id',
                    holderId: 'internal-holder',
                    acquiredAt: new Date('2026-09-08T08:00:00.000Z'),
                    expiresAt: new Date('2026-09-08T08:05:00.000Z'),
                },
                errorCode: null,
            }),
        );
        lockFindOneMock.mockReturnValue(
            createOneQuery({
                expiresAt: new Date('2026-09-08T10:05:00.000Z'),
            }),
        );

        const state = await getPlatformRetentionState({
            targetKey: 'audit_log',
            now: new Date('2026-09-08T10:00:00.000Z'),
        });

        expect(state.runtime).toEqual({
            locked: true,
            lockExpiresAt:
                new Date('2026-09-08T10:05:00.000Z'),
        });
        expect(state.latestExecution.lease).toEqual({
            acquiredAt: new Date('2026-09-08T08:00:00.000Z'),
            expiresAt: new Date('2026-09-08T08:05:00.000Z'),
        });
        expect(state.latestExecution.lease.leaseId)
            .toBeUndefined();
        expect(state.latestExecution.lease.holderId)
            .toBeUndefined();
    });

    it('pagine uniquement l’historique de la target demandée', async () => {
        executionFindMock.mockReturnValue(
            createListQuery([]),
        );
        countDocumentsMock.mockResolvedValue(41);

        const result = await listPlatformRetentionExecutions({
            targetKey: 'audit_log',
            page: 2,
            limit: 20,
        });

        expect(executionFindMock).toHaveBeenCalledWith({
            'policySnapshot.targetKey': 'audit_log',
        });
        expect(countDocumentsMock).toHaveBeenCalledWith({
            'policySnapshot.targetKey': 'audit_log',
        });
        expect(result.pagination).toEqual({
            page: 2,
            limit: 20,
            total: 41,
            pages: 3,
        });
    });
});
