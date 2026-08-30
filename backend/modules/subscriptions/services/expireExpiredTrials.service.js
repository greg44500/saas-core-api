import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../constants/auditActions.constants.js';
import {
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_STATUS,
} from '../../../constants/subscription.constants.js';
import { createAuditLog } from '../../auditLog/auditLog.service.js';
import { Subscription } from '../subscription.model.js';

const DEFAULT_TRIAL_EXPIRATION_BATCH_SIZE = 100;
const MAX_TRIAL_EXPIRATION_BATCH_SIZE = 500;

const assertValidDate = (value) => {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
        throw new TypeError(
            'now must be a valid Date to expire commercial trials',
        );
    }
};

const assertValidBatchSize = (batchSize) => {
    if (
        !Number.isInteger(batchSize)
        || batchSize <= 0
        || batchSize > MAX_TRIAL_EXPIRATION_BATCH_SIZE
    ) {
        throw new TypeError(
            `batchSize must be an integer between 1 and ${MAX_TRIAL_EXPIRATION_BATCH_SIZE}`,
        );
    }
};

/**
 * Expire un lot borné de trials commerciaux arrivés à échéance.
 *
 * Le tri stable et la limite permettent à l'ordonnanceur de rejouer le job
 * jusqu'à épuisement sans charger toute la collection en mémoire. Chaque
 * transition reste conditionnelle et transactionnelle : un candidat modifié
 * concurremment est simplement compté comme ignoré.
 */
const expireExpiredTrials = async ({
    now = new Date(),
    batchSize = DEFAULT_TRIAL_EXPIRATION_BATCH_SIZE,
} = {}) => {
    assertValidDate(now);
    assertValidBatchSize(batchSize);

    const candidates = await Subscription.find({
        kind: SUBSCRIPTION_KIND.COMMERCIAL,
        status: SUBSCRIPTION_STATUS.TRIALING,
        trialEndsAt: mongoose.trusted({
            $type: 'date',
            $lte: now,
        }),
    })
        .sort({ trialEndsAt: 1, _id: 1 })
        .limit(batchSize);

    let expired = 0;
    let skipped = 0;

    for (const candidate of candidates) {
        let didExpire = false;

        await mongoose.connection.transaction(async (session) => {
            const expiredSubscription =
                await Subscription.findOneAndUpdate(
                    {
                        _id: candidate._id,
                        kind: SUBSCRIPTION_KIND.COMMERCIAL,
                        status: SUBSCRIPTION_STATUS.TRIALING,
                        trialEndsAt: mongoose.trusted({
                            $type: 'date',
                            $lte: now,
                        }),
                    },
                    {
                        $set: {
                            status: SUBSCRIPTION_STATUS.EXPIRED,
                            cancelAtPeriodEnd: false,
                            currentPeriodEnd: candidate.trialEndsAt,
                        },
                    },
                    {
                        returnDocument: 'after',
                        runValidators: true,
                        session,
                    },
                );

            if (!expiredSubscription) {
                return;
            }

            await createAuditLog(
                {
                    actor: null,
                    workspace: candidate.workspace,
                    action: AUDIT_ACTION.SUBSCRIPTION_EXPIRED,
                    entityType: AUDIT_ENTITY_TYPE.SUBSCRIPTION,
                    entityId: expiredSubscription._id,
                    status: AUDIT_STATUS.SUCCESS,
                    metadata: {
                        reason: 'trial_natural_expiration',
                        previousStatus: SUBSCRIPTION_STATUS.TRIALING,
                        newStatus: SUBSCRIPTION_STATUS.EXPIRED,
                        effectiveAt: candidate.trialEndsAt,
                        processedAt: now,
                        baselineFallbackEnabled: true,
                        trialEligibilityPreserved: true,
                    },
                },
                { session },
            );

            didExpire = true;
        });

        if (didExpire) {
            expired += 1;
        } else {
            skipped += 1;
        }
    }

    return {
        processedAt: now,
        scanned: candidates.length,
        expired,
        skipped,
        hasMore: candidates.length === batchSize,
    };
};

export {
    DEFAULT_TRIAL_EXPIRATION_BATCH_SIZE,
    MAX_TRIAL_EXPIRATION_BATCH_SIZE,
    expireExpiredTrials,
};
