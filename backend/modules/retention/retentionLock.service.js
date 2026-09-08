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

/**
 * Garantit que l'index unique protégeant un target de rétention existe avant
 * toute tentative d'acquisition.
 *
 * La promesse est mémorisée pour éviter de relancer createIndexes() à chaque
 * exécution. En cas d'échec elle est réinitialisée afin qu'une exécution
 * ultérieure puisse retenter l'initialisation au lieu de rester bloquée sur un
 * échec ancien.
 */
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

/**
 * Construit un identifiant de détenteur suffisamment distinct pour identifier
 * une exécution dans un environnement multi-processus ou multi-instance.
 *
 * Cet identifiant sert au contrôle d'ownership du lease ; il n'accorde aucun
 * droit à lui seul et n'est jamais accepté depuis un payload utilisateur.
 */
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
 *
 * Un target ne peut être acquis que si aucun lease actif n'existe ou si le
 * précédent a expiré. Une collision d'index unique est interprétée comme un
 * échec normal de contention et retourne null, jamais comme une autorisation à
 * poursuivre sans verrou.
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

/**
 * Prolonge uniquement un lease encore actif détenu par le même holder.
 *
 * Le triplet targetKey + leaseId + holderId évite qu'une instance ayant perdu
 * son lease puisse prolonger celui d'un successeur. Un lease déjà expiré ne
 * peut pas être ressuscité : le service retourne null et l'appelant doit alors
 * interrompre le traitement protégé.
 */
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

/**
 * Libère un lease seulement si l'appelant en possède encore l'identité exacte.
 *
 * Cette opération est volontairement sûre à rejouer : un lease absent, déjà
 * libéré ou remplacé ne provoque aucune libération du lease courant et retourne
 * false. Cette propriété évite qu'un worker retardé efface le verrou acquis
 * entre-temps par une autre instance.
 */
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
