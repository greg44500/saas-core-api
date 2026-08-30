import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../constants/auditActions.constants.js';
import {
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_PLAN_CHANGE_TYPE,
    SUBSCRIPTION_STATUS,
} from '../../../constants/subscription.constants.js';
import { createAuditLog } from '../../auditLog/auditLog.service.js';
import { Subscription } from '../subscription.model.js';
import {
    calculatePaidPeriodEnd,
} from './activatePaidSubscriptionFromTrial.helpers.js';

const DEFAULT_SCHEDULED_DOWNGRADE_BATCH_SIZE = 100;
const MAX_SCHEDULED_DOWNGRADE_BATCH_SIZE = 500;

const isValidDate = (value) =>
    value instanceof Date && !Number.isNaN(value.getTime());

const assertValidBatchSize = (batchSize) => {
    if (
        !Number.isInteger(batchSize)
        || batchSize <= 0
        || batchSize > MAX_SCHEDULED_DOWNGRADE_BATCH_SIZE
    ) {
        throw new TypeError(
            `batchSize must be an integer between 1 and ${MAX_SCHEDULED_DOWNGRADE_BATCH_SIZE}`,
        );
    }
};

/**
 * Applique un lot borné de downgrades arrivés à leur date contractuelle.
 *
 * Le snapshot commercial enregistré lors de la programmation devient la
 * nouvelle référence de la Subscription. Le tri stable permet des passages
 * successifs déterministes, tandis que chaque transition reste protégée par
 * son filtre conditionnel et sa propre transaction.
 */
const applyScheduledDowngrades = async ({
    now = new Date(),
    batchSize = DEFAULT_SCHEDULED_DOWNGRADE_BATCH_SIZE,
} = {}) => {
    if (!isValidDate(now)) {
        throw new TypeError('now must be a valid Date');
    }
    assertValidBatchSize(batchSize);

    const candidates = await Subscription.find({
        kind: SUBSCRIPTION_KIND.COMMERCIAL,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        'scheduledChange.type': SUBSCRIPTION_PLAN_CHANGE_TYPE.DOWNGRADE,
        'scheduledChange.effectiveAt': mongoose.trusted({
            $type: 'date',
            $lte: now,
        }),
    })
        .sort({ 'scheduledChange.effectiveAt': 1, _id: 1 })
        .limit(batchSize);

    let applied = 0;
    let skipped = 0;

    for (const candidate of candidates) {
        await mongoose.connection.transaction(async (session) => {
            const scheduledChange = candidate.scheduledChange;
            const nextPeriodEnd = calculatePaidPeriodEnd(
                scheduledChange.effectiveAt,
                scheduledChange.targetBillingInterval,
            );

            const updated = await Subscription.findOneAndUpdate(
                {
                    _id: candidate._id,
                    kind: SUBSCRIPTION_KIND.COMMERCIAL,
                    status: SUBSCRIPTION_STATUS.ACTIVE,
                    'scheduledChange.type':
                        SUBSCRIPTION_PLAN_CHANGE_TYPE.DOWNGRADE,
                    'scheduledChange.targetPlan': scheduledChange.targetPlan,
                    'scheduledChange.effectiveAt': mongoose.trusted({
                        $type: 'date',
                        $lte: now,
                    }),
                },
                {
                    $set: {
                        plan: scheduledChange.targetPlan,
                        billingInterval:
                            scheduledChange.targetBillingInterval,
                        currency: scheduledChange.targetCurrency,
                        priceExclTaxMinor:
                            scheduledChange.targetPriceExclTaxMinor,
                        currentPeriodStart: scheduledChange.effectiveAt,
                        currentPeriodEnd: nextPeriodEnd,
                        scheduledChange: null,
                        updatedBy: null,
                    },
                },
                {
                    returnDocument: 'after',
                    runValidators: true,
                    session,
                },
            );

            if (!updated) {
                skipped += 1;
                return;
            }

            await createAuditLog(
                {
                    actor: null,
                    action: AUDIT_ACTION.SUBSCRIPTION_DOWNGRADE_APPLIED,
                    entityType: AUDIT_ENTITY_TYPE.SUBSCRIPTION,
                    entityId: updated._id,
                    status: AUDIT_STATUS.SUCCESS,
                    metadata: {
                        previousPlan: candidate.plan,
                        targetPlan: scheduledChange.targetPlan,
                        billingInterval:
                            scheduledChange.targetBillingInterval,
                        currency: scheduledChange.targetCurrency,
                        priceExclTaxMinor:
                            scheduledChange.targetPriceExclTaxMinor,
                        effectiveAt: scheduledChange.effectiveAt,
                        nextPeriodEnd,
                        processedAt: now,
                    },
                },
                { session },
            );

            applied += 1;
        });
    }

    return {
        processedAt: now,
        scanned: candidates.length,
        applied,
        skipped,
        hasMore: candidates.length === batchSize,
    };
};

export {
    DEFAULT_SCHEDULED_DOWNGRADE_BATCH_SIZE,
    MAX_SCHEDULED_DOWNGRADE_BATCH_SIZE,
    applyScheduledDowngrades,
};
