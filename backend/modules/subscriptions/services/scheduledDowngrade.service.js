import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../constants/auditActions.constants.js';
import {
    BILLING_INTERVAL,
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_PLAN_CHANGE_TYPE,
    SUBSCRIPTION_STATUS,
} from '../../../constants/subscription.constants.js';
import {
    PLAN_STATUS,
} from '../../../constants/plan.constants.js';
import { AppError } from '../../../utils/appError.js';
import { createAuditLog } from '../../auditLog/auditLog.service.js';
import { Plan } from '../../plan/plan.model.js';
import { isBaselinePlan } from '../../plan/plan.service.js';
import { Subscription } from '../subscription.model.js';

const isValidDate = (value) =>
    value instanceof Date && !Number.isNaN(value.getTime());

const getCatalogPrice = ({ plan, billingInterval }) => {
    if (billingInterval === BILLING_INTERVAL.MONTHLY) {
        return plan.priceMonthlyExclTaxMinor;
    }

    if (billingInterval === BILLING_INTERVAL.YEARLY) {
        return plan.priceYearlyExclTaxMinor;
    }

    throw new AppError(
        'Le downgrade nécessite une périodicité commerciale payante',
        409,
    );
};

const buildScheduledDowngradeDto = (subscription) => ({
    id: subscription._id.toString(),
    workspace: subscription.workspace?.toString() ?? null,
    plan: subscription.plan?.toString() ?? null,
    status: subscription.status,
    billingInterval: subscription.billingInterval,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    scheduledChange: subscription.scheduledChange
        ? {
            type: subscription.scheduledChange.type,
            targetPlan:
                subscription.scheduledChange.targetPlan?.toString() ?? null,
            targetBillingInterval:
                subscription.scheduledChange.targetBillingInterval,
            targetCurrency:
                subscription.scheduledChange.targetCurrency,
            targetPriceExclTaxMinor:
                subscription.scheduledChange.targetPriceExclTaxMinor,
            effectiveAt: subscription.scheduledChange.effectiveAt,
            requestedAt: subscription.scheduledChange.requestedAt,
            requestedBy:
                subscription.scheduledChange.requestedBy?.toString() ?? null,
        }
        : null,
});

const assertSchedulableCommercialSubscription = ({ subscription, now }) => {
    if (subscription.kind !== SUBSCRIPTION_KIND.COMMERCIAL) {
        throw new AppError(
            'Seule une souscription commerciale peut programmer un downgrade',
            409,
        );
    }

    if (subscription.status !== SUBSCRIPTION_STATUS.ACTIVE) {
        throw new AppError(
            'Le downgrade nécessite une souscription commerciale active',
            409,
        );
    }

    if (
        !isValidDate(subscription.currentPeriodEnd)
        || subscription.currentPeriodEnd <= now
    ) {
        throw new AppError(
            'La période contractuelle de cette souscription est déjà terminée',
            409,
        );
    }

    if (subscription.cancelAtPeriodEnd === true) {
        throw new AppError(
            'Une annulation en fin de période est déjà programmée',
            409,
        );
    }

    if (subscription.scheduledChange) {
        throw new AppError(
            'Un changement de plan est déjà programmé',
            409,
        );
    }
};

/**
 * Programme un downgrade commercial à la fin de la période déjà payée.
 *
 * Aucun droit n'est retiré immédiatement : le plan courant reste effectif
 * jusqu'à `currentPeriodEnd`. Le prix et la devise du plan cible sont
 * snapshotés maintenant afin de figer l'intention commerciale enregistrée.
 *
 * Ce service ne calcule aucun prorata et ne traite aucun paiement. Il ne
 * couvre volontairement que les downgrades à périodicité identique.
 */
const scheduleSubscriptionDowngrade = async ({
    subscriptionId,
    targetPlanId,
    actorId,
    now = new Date(),
    ipAddress = null,
    userAgent = null,
}) => {
    if (!subscriptionId || !targetPlanId || !actorId) {
        throw new TypeError(
            'subscriptionId, targetPlanId and actorId are required to schedule a downgrade',
        );
    }

    if (!isValidDate(now)) {
        throw new TypeError('now must be a valid Date');
    }

    let result;

    await mongoose.connection.transaction(async (session) => {
        const subscription = await Subscription.findById(
            subscriptionId,
        ).session(session);

        if (!subscription) {
            throw new AppError('Souscription introuvable', 404);
        }

        assertSchedulableCommercialSubscription({ subscription, now });

        if (subscription.plan.toString() === targetPlanId.toString()) {
            throw new AppError(
                'Le plan cible doit être différent du plan actuel',
                409,
            );
        }

        const [currentPlan, targetPlan] = await Promise.all([
            Plan.findById(subscription.plan).session(session),
            Plan.findById(targetPlanId).session(session),
        ]);

        if (!currentPlan) {
            throw new AppError(
                'Le plan actuel de la souscription est introuvable',
                500,
            );
        }

        if (!targetPlan || targetPlan.status !== PLAN_STATUS.ACTIVE) {
            throw new AppError(
                'Le plan cible est introuvable ou indisponible',
                409,
            );
        }

        if (isBaselinePlan(targetPlan)) {
            throw new AppError(
                'Le retour au plan de référence utilise le cycle de résiliation, pas un downgrade commercial',
                409,
            );
        }

        if (targetPlan.currency !== subscription.currency) {
            throw new AppError(
                'Le changement de devise n’est pas pris en charge par le downgrade programmé',
                409,
            );
        }

        const currentCatalogPrice = getCatalogPrice({
            plan: currentPlan,
            billingInterval: subscription.billingInterval,
        });
        const targetCatalogPrice = getCatalogPrice({
            plan: targetPlan,
            billingInterval: subscription.billingInterval,
        });

        if (targetCatalogPrice >= currentCatalogPrice) {
            throw new AppError(
                'Le plan cible ne constitue pas un downgrade pour cette périodicité',
                409,
            );
        }

        const scheduledChange = {
            type: SUBSCRIPTION_PLAN_CHANGE_TYPE.DOWNGRADE,
            targetPlan: targetPlan._id,
            targetBillingInterval: subscription.billingInterval,
            targetCurrency: targetPlan.currency,
            targetPriceExclTaxMinor: targetCatalogPrice,
            effectiveAt: subscription.currentPeriodEnd,
            requestedAt: now,
            requestedBy: actorId,
        };

        result = await Subscription.findOneAndUpdate(
            {
                _id: subscription._id,
                kind: SUBSCRIPTION_KIND.COMMERCIAL,
                status: SUBSCRIPTION_STATUS.ACTIVE,
                cancelAtPeriodEnd: false,
                scheduledChange: null,
                currentPeriodEnd: mongoose.trusted({
                    $type: 'date',
                    $gt: now,
                }),
            },
            {
                $set: {
                    scheduledChange,
                    updatedBy: actorId,
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );

        if (!result) {
            throw new AppError(
                'La souscription a été modifiée concurremment',
                409,
            );
        }

        await createAuditLog(
            {
                actor: actorId,
                action: AUDIT_ACTION.SUBSCRIPTION_DOWNGRADE_SCHEDULED,
                entityType: AUDIT_ENTITY_TYPE.SUBSCRIPTION,
                entityId: result._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    previousPlan: subscription.plan,
                    targetPlan: targetPlan._id,
                    billingInterval: subscription.billingInterval,
                    targetCurrency: targetPlan.currency,
                    targetPriceExclTaxMinor: targetCatalogPrice,
                    effectiveAt: subscription.currentPeriodEnd,
                },
            },
            { session },
        );
    });

    return buildScheduledDowngradeDto(result);
};

/**
 * Révoque un downgrade tant qu'il n'est pas encore arrivé à échéance.
 *
 * Le plan courant n'a pas été modifié par E2 : révoquer l'intention consiste
 * donc uniquement à retirer `scheduledChange`, sans restauration artificielle
 * de données contractuelles.
 */
const revokeScheduledSubscriptionDowngrade = async ({
    subscriptionId,
    actorId,
    now = new Date(),
    ipAddress = null,
    userAgent = null,
}) => {
    if (!subscriptionId || !actorId) {
        throw new TypeError(
            'subscriptionId and actorId are required to revoke a scheduled downgrade',
        );
    }

    if (!isValidDate(now)) {
        throw new TypeError('now must be a valid Date');
    }

    let result;

    await mongoose.connection.transaction(async (session) => {
        const subscription = await Subscription.findById(
            subscriptionId,
        ).session(session);

        if (!subscription) {
            throw new AppError('Souscription introuvable', 404);
        }

        if (
            subscription.kind !== SUBSCRIPTION_KIND.COMMERCIAL
            || subscription.status !== SUBSCRIPTION_STATUS.ACTIVE
        ) {
            throw new AppError(
                'La révocation nécessite une souscription commerciale active',
                409,
            );
        }

        if (!subscription.scheduledChange) {
            throw new AppError(
                'Aucun downgrade n’est programmé',
                409,
            );
        }

        if (
            subscription.scheduledChange.type
            !== SUBSCRIPTION_PLAN_CHANGE_TYPE.DOWNGRADE
        ) {
            throw new AppError(
                'Le changement programmé n’est pas un downgrade révocable',
                409,
            );
        }

        if (
            !isValidDate(subscription.scheduledChange.effectiveAt)
            || subscription.scheduledChange.effectiveAt <= now
        ) {
            throw new AppError(
                'Le downgrade a atteint son échéance et ne peut plus être révoqué',
                409,
            );
        }

        const previousScheduledChange = subscription.scheduledChange;

        result = await Subscription.findOneAndUpdate(
            {
                _id: subscription._id,
                kind: SUBSCRIPTION_KIND.COMMERCIAL,
                status: SUBSCRIPTION_STATUS.ACTIVE,
                'scheduledChange.type':
                    SUBSCRIPTION_PLAN_CHANGE_TYPE.DOWNGRADE,
                'scheduledChange.effectiveAt': mongoose.trusted({
                    $type: 'date',
                    $gt: now,
                }),
            },
            {
                $set: {
                    scheduledChange: null,
                    updatedBy: actorId,
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );

        if (!result) {
            throw new AppError(
                'La souscription a été modifiée concurremment',
                409,
            );
        }

        await createAuditLog(
            {
                actor: actorId,
                action: AUDIT_ACTION.SUBSCRIPTION_DOWNGRADE_REVOKED,
                entityType: AUDIT_ENTITY_TYPE.SUBSCRIPTION,
                entityId: result._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    targetPlan: previousScheduledChange.targetPlan,
                    effectiveAt: previousScheduledChange.effectiveAt,
                },
            },
            { session },
        );
    });

    return buildScheduledDowngradeDto(result);
};

export {
    buildScheduledDowngradeDto,
    revokeScheduledSubscriptionDowngrade,
    scheduleSubscriptionDowngrade,
};