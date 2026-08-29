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

const isValidDate = (value) =>
    value instanceof Date && !Number.isNaN(value.getTime());

/**
 * Applique les downgrades dont la date d'effet contractuelle est atteinte.
 *
 * Le snapshot commercial enregistré lors de la programmation devient la
 * nouvelle référence de la Subscription. Le service ne recalcule jamais le
 * prix depuis Plan : une modification ultérieure du catalogue ne doit pas
 * réécrire rétroactivement l'intention déjà acceptée.
 *
 * La nouvelle période démarre exactement à `effectiveAt` et conserve les
 * règles calendaires monthly/yearly déjà utilisées par le domaine payant.
 *
 * Chaque candidat utilise sa propre transaction afin qu'un échec isolé
 * n'annule pas les transitions déjà valides d'autres workspaces.
 */
const applyScheduledDowngrades = async ({ now = new Date() } = {}) => {
    if (!isValidDate(now)) {
        throw new TypeError('now must be a valid Date');
    }

    const candidates = await Subscription.find({
        kind: SUBSCRIPTION_KIND.COMMERCIAL,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        'scheduledChange.type': SUBSCRIPTION_PLAN_CHANGE_TYPE.DOWNGRADE,
        'scheduledChange.effectiveAt': mongoose.trusted({
            $type: 'date',
            $lte: now,
        }),
    });

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
    };
};

export { applyScheduledDowngrades };
