import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

const {
    createMock,
    getCurrentRetentionPolicyMock,
} = vi.hoisted(() => ({
    createMock: vi.fn(),
    getCurrentRetentionPolicyMock: vi.fn(),
}));

vi.mock(
    '../../../modules/retention/retentionPolicy.model.js',
    () => ({
        RetentionPolicy: {
            create: createMock,
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
    createPlatformRetentionPolicyVersion,
} from '../../../modules/platform/retention/services/platformRetentionPolicy.service.js';

const settings = {
    enabled: true,
    retentionDays: 365,
    batchSize: 100,
    maxBatchesPerRun: 10,
    schedule: {
        intervalMinutes: 1440,
    },
    manualExecutionEnabled: true,
};

beforeEach(() => {
    vi.clearAllMocks();
});


describe('createPlatformRetentionPolicyVersion', () => {
    it('crée la première version en injectant la target et schemaVersion côté serveur', async () => {
        getCurrentRetentionPolicyMock.mockResolvedValue(null);
        createMock.mockResolvedValue({
            _id: 'policy-id',
            version: 1,
            config: {
                schemaVersion: 1,
                targetKey: 'audit_log',
                ...settings,
            },
            createdBy: 'actor-id',
            createdAt: new Date('2026-09-08T10:00:00.000Z'),
            toObject() {
                return {
                    _id: this._id,
                    version: this.version,
                    config: this.config,
                    createdBy: this.createdBy,
                    createdAt: this.createdAt,
                };
            },
        });

        const result = await createPlatformRetentionPolicyVersion({
            targetKey: 'audit_log',
            expectedVersion: null,
            settings,
            actorId: 'actor-id',
        });

        expect(createMock).toHaveBeenCalledWith({
            version: 1,
            config: {
                schemaVersion: 1,
                targetKey: 'audit_log',
                ...settings,
            },
            createdBy: 'actor-id',
        });
        expect(result.version).toBe(1);
    });

    it('refuse une modification fondée sur une version obsolète', async () => {
        getCurrentRetentionPolicyMock.mockResolvedValue({
            _id: 'policy-id',
            version: 4,
            config: {
                schemaVersion: 1,
                targetKey: 'audit_log',
                ...settings,
            },
        });

        await expect(
            createPlatformRetentionPolicyVersion({
                targetKey: 'audit_log',
                expectedVersion: 3,
                settings,
                actorId: 'actor-id',
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(createMock).not.toHaveBeenCalled();
    });

    it('transforme une collision concurrente d’index en conflit contrôlé', async () => {
        getCurrentRetentionPolicyMock.mockResolvedValue({
            _id: 'policy-id',
            version: 4,
            config: {
                schemaVersion: 1,
                targetKey: 'audit_log',
                ...settings,
            },
        });
        createMock.mockRejectedValue({
            code: 11000,
        });

        await expect(
            createPlatformRetentionPolicyVersion({
                targetKey: 'audit_log',
                expectedVersion: 4,
                settings,
                actorId: 'actor-id',
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });
    });

    it('refuse une configuration hors bornes code-owned', async () => {
        await expect(
            createPlatformRetentionPolicyVersion({
                targetKey: 'audit_log',
                expectedVersion: null,
                settings: {
                    ...settings,
                    batchSize: 501,
                },
                actorId: 'actor-id',
            }),
        ).rejects.toMatchObject({
            statusCode: 400,
        });

        expect(getCurrentRetentionPolicyMock)
            .not.toHaveBeenCalled();
        expect(createMock).not.toHaveBeenCalled();
    });
});
