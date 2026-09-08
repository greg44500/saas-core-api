import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';

import {
    RetentionLock,
} from '../../modules/retention/retentionLock.model.js';

const VALID_LEASE_ID = '123e4567-e89b-42d3-a456-426614174000';

describe('RetentionLock model', () => {
    it('accepte un lock libre persistant', async () => {
        const lock = new RetentionLock({
            targetKey: 'audit_log',
        });

        await expect(lock.validate()).resolves.toBeUndefined();
    });

    it('exige une lease complète', async () => {
        const lock = new RetentionLock({
            targetKey: 'audit_log',
            leaseId: VALID_LEASE_ID,
            holderId: 'worker-1',
        });

        await expect(lock.validate()).rejects.toThrow(
            'Une lease de rétention doit être entièrement renseignée',
        );
    });

    it('refuse une expiration antérieure à l’acquisition', async () => {
        const lock = new RetentionLock({
            targetKey: 'audit_log',
            leaseId: VALID_LEASE_ID,
            holderId: 'worker-1',
            acquiredAt: new Date('2026-09-08T10:00:00.000Z'),
            expiresAt: new Date('2026-09-08T09:59:59.000Z'),
        });

        await expect(lock.validate()).rejects.toThrow(
            'La lease de rétention doit expirer après son acquisition.',
        );
    });

    it('déclare un index unique par target', () => {
        const indexes = RetentionLock.schema.indexes();

        expect(indexes).toEqual(
            expect.arrayContaining([
                [
                    { targetKey: 1 },
                    expect.objectContaining({
                        unique: true,
                        name: 'unique_retention_lock_target',
                    }),
                ],
                [
                    { expiresAt: 1 },
                    expect.objectContaining({
                        name: 'retention_lock_expiry',
                    }),
                ],
            ]),
        );
    });
});
