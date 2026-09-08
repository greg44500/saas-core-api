import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';

import {
    ACTIVE_RETENTION_TARGET_REGISTRY,
} from '../../config/applicationRetention.registry.js';
import {
    RETENTION_LOCK_LEASE_MS,
} from '../../constants/retention.constants.js';
import { RetentionLock } from './retentionLock.model.js';

const assertValidDate = (value, name) => {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
        throw new TypeError(`${name} must be a valid Date`);
    }
};

const assertValidHolderId = (holderId) => {
    if (
        typeof holderId !== 'string'
        || holderId.trim().length === 0
        || holderId.trim().length > 200
    ) {
        throw new TypeError(
            'holderId must be a non-empty string up to 200 characters',
        );
    }
};

const assertKnownTarget = (targetKey) => {
    if (!ACTIVE_RETENTION_TARGET_REGISTRY.hasTarget(targetKey)) {
        throw new TypeError(`Unknown retention target: ${targetKey}`);
    }
};

let retentionLockIndexesReadyPromise = null;

const ensureRetentionLockIndexes = () => {
    if (!retentionLockIndexesReadyPromise) {
        retentionLockIndexesReadyPromise = RetentionLock
            .createIndexes()
            .catch((error) => {
                retentionLockIndexesReadyPromise = null;
                throw error;
            });
    }

    return retentionLockIndexesReadyPromise;
};

const createRetentionHolderId = (prefix = 'retention') => {
    const safePrefix = String(prefix)
        .replace(/[^a-zA-Z0-9_-]/g, '-')
        .slice(0, 40) || 'retention';

    return `${safePrefix}:${hostname()}:${process.pid}:${randomUUID()}`
        .slice(0, 200);
};

const buildLease = ({ targetKey, holderId, leaseId, acquiredAt }) => ({
    targetKey,
    holderId,
    leaseId,
    acquiredAt,
    expiresAt: new Date(
        acquiredAt.getTime() + RETENTION_LOCK_LEASE_MS,
    ),
});

/**
 * Acquisition atomique fail-closed.
 *
 * createIndexes() est volontaire : la sûreté multi-instance dépend de l'index
 * unique targetKey même lorsque Mongoose autoIndex est désactivé.
 */
const acquireRetentionLock = async ({
    targetKey,
    holderId,
    now = new Date(),
}) => {
    assertKnownTarget(targetKey);
    assertValidHolderId(holderId);
    assertValidDate(now, 'now');

    await ensureRetentionLockIndexes();

    const lease = buildLease({
        targetKey,
        holderId: holderId.trim(),
        leaseId: randomUUID(),
        acquiredAt: now,
    });

    try {
        const result = await RetentionLock.collection.updateOne(
            {
                targetKey,
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
            },
            {
                $set: {
                    leaseId: lease.leaseId,
                    holderId: lease.holderId,
                    acquiredAt: lease.acquiredAt,
                    expiresAt: lease.expiresAt,
                    updatedAt: now,
                },
                $setOnInsert: {
                    targetKey,
                    createdAt: now,
                },
            },
            { upsert: true },
        );

        if (result.matchedCount !== 1 && result.upsertedCount !== 1) {
            return null;
        }

        return lease;
    } catch (error) {
        if (error?.code === 11000) {
            return null;
        }

        throw error;
    }
};

const renewRetentionLock = async ({
    lease,
    now = new Date(),
}) => {
    if (!lease) {
        throw new TypeError('lease is required');
    }

    assertKnownTarget(lease.targetKey);
    assertValidHolderId(lease.holderId);
    assertValidDate(now, 'now');

    const expiresAt = new Date(
        now.getTime() + RETENTION_LOCK_LEASE_MS,
    );

    const result = await RetentionLock.collection.updateOne(
        {
            targetKey: lease.targetKey,
            leaseId: lease.leaseId,
            holderId: lease.holderId,
            expiresAt: {
                $gt: now,
            },
        },
        {
            $set: {
                expiresAt,
                updatedAt: now,
            },
        },
    );

    if (result.matchedCount !== 1) {
        return null;
    }

    return {
        ...lease,
        expiresAt,
    };
};

const releaseRetentionLock = async ({
    lease,
    now = new Date(),
}) => {
    if (!lease) return false;

    assertValidDate(now, 'now');

    const result = await RetentionLock.collection.updateOne(
        {
            targetKey: lease.targetKey,
            leaseId: lease.leaseId,
            holderId: lease.holderId,
        },
        {
            $set: {
                leaseId: null,
                holderId: null,
                acquiredAt: null,
                expiresAt: null,
                updatedAt: now,
            },
        },
    );

    return result.matchedCount === 1;
};

export {
    acquireRetentionLock,
    createRetentionHolderId,
    ensureRetentionLockIndexes,
    releaseRetentionLock,
    renewRetentionLock,
};
