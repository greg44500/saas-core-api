import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

const {
    initMock,
    updateOneMock,
} = vi.hoisted(() => ({
    initMock: vi.fn(),
    updateOneMock: vi.fn(),
}));

vi.mock('../../config/applicationRetention.registry.js', () => ({
    ACTIVE_RETENTION_TARGET_REGISTRY: {
        hasTarget: (targetKey) => targetKey === 'audit_log',
    },
}));

vi.mock('../../modules/retention/retentionLock.model.js', () => ({
    RetentionLock: {
        init: initMock,
        collection: {
            updateOne: updateOneMock,
        },
    },
}));

import {
    RETENTION_LOCK_LEASE_MS,
} from '../../constants/retention.constants.js';
import {
    acquireRetentionLock,
    releaseRetentionLock,
    renewRetentionLock,
} from '../../modules/retention/retentionLock.service.js';

beforeEach(() => {
    vi.clearAllMocks();
    initMock.mockResolvedValue(undefined);
});

describe('retentionLock.service', () => {
    it('acquiert atomiquement une target libre après initialisation des indexes', async () => {
        const now = new Date('2026-09-08T10:00:00.000Z');
        updateOneMock.mockResolvedValue({
            matchedCount: 0,
            upsertedCount: 1,
        });

        const lease = await acquireRetentionLock({
            targetKey: 'audit_log',
            holderId: 'worker-a',
            now,
        });

        expect(initMock).toHaveBeenCalledOnce();
        expect(updateOneMock).toHaveBeenCalledOnce();

        const [filter, update, options] = updateOneMock.mock.calls[0];

        expect(filter).toEqual({
            targetKey: 'audit_log',
            $or: [
                {
                    leaseId: null,
                    holderId: null,
                    acquiredAt: null,
                    expiresAt: null,
                },
                {
                    expiresAt: {
                        $lte: now,
                    },
                },
            ],
        });
        expect(options).toEqual({ upsert: true });
        expect(update.$set.holderId).toBe('worker-a');
        expect(update.$set.expiresAt).toEqual(
            new Date(now.getTime() + RETENTION_LOCK_LEASE_MS),
        );
        expect(lease).toMatchObject({
            targetKey: 'audit_log',
            holderId: 'worker-a',
            acquiredAt: now,
        });
        expect(lease.leaseId).toMatch(
            /^[0-9a-f-]{36}$/,
        );
    });

    it('considère une collision unique comme un lock déjà détenu', async () => {
        updateOneMock.mockRejectedValue(
            Object.assign(new Error('duplicate key'), {
                code: 11000,
            }),
        );

        await expect(
            acquireRetentionLock({
                targetKey: 'audit_log',
                holderId: 'worker-b',
                now: new Date(),
            }),
        ).resolves.toBeNull();
    });

    it('renouvelle uniquement une lease encore active et possédée', async () => {
        const now = new Date('2026-09-08T10:01:00.000Z');
        const lease = {
            targetKey: 'audit_log',
            leaseId: 'lease-id',
            holderId: 'worker-a',
            acquiredAt: new Date('2026-09-08T10:00:00.000Z'),
            expiresAt: new Date('2026-09-08T10:05:00.000Z'),
        };
        updateOneMock.mockResolvedValue({
            matchedCount: 1,
        });

        const renewed = await renewRetentionLock({
            lease,
            now,
        });

        expect(updateOneMock.mock.calls[0][0]).toEqual({
            targetKey: 'audit_log',
            leaseId: 'lease-id',
            holderId: 'worker-a',
            expiresAt: {
                $gt: now,
            },
        });
        expect(renewed.expiresAt).toEqual(
            new Date(now.getTime() + RETENTION_LOCK_LEASE_MS),
        );
    });

    it('signale la perte de lease lorsqu’un renouvellement ne matche plus', async () => {
        updateOneMock.mockResolvedValue({
            matchedCount: 0,
        });

        await expect(
            renewRetentionLock({
                lease: {
                    targetKey: 'audit_log',
                    leaseId: 'lease-id',
                    holderId: 'worker-a',
                },
                now: new Date(),
            }),
        ).resolves.toBeNull();
    });

    it('libère uniquement le détenteur courant', async () => {
        updateOneMock.mockResolvedValue({
            matchedCount: 1,
        });

        const released = await releaseRetentionLock({
            lease: {
                targetKey: 'audit_log',
                leaseId: 'lease-id',
                holderId: 'worker-a',
            },
            now: new Date('2026-09-08T10:02:00.000Z'),
        });

        expect(released).toBe(true);
        expect(updateOneMock.mock.calls[0][0]).toEqual({
            targetKey: 'audit_log',
            leaseId: 'lease-id',
            holderId: 'worker-a',
        });
    });
});
