import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../../constants/auditActions.constants.js';

import {
    PLAN_KEY,
    PLAN_STATUS,
} from '../../../../constants/plan.constants.js';

import {
    BILLING_INTERVAL,
    DISCOUNT_TYPE,
} from '../../../../constants/subscription.constants.js';

import {
    AppError,
} from '../../../../utils/appError.js';

import {
    createAuditLog,
} from '../../../auditLog/auditLog.service.js';

import {
    Plan,
} from '../../../plan/plan.model.js';

import {
    Subscription,
} from '../../../subscriptions/subscription.model.js';


/**
 * Résout le tarif à snapshotter selon le plan et la périodicité demandée.
 *
 * Le plan gratuit impose `none` et un prix nul. Les autres plans doivent
 * utiliser une périodicité mensuelle ou annuelle.
 *
 * @param {object} plan
 * @param {string} billingInterval
 * @returns {number}
 */
const resolveSubscriptionPrice = (
    plan,
    billingInterval,
) => {
    if (plan.key === PLAN_KEY.FREE) {
        if (billingInterval !== BILLING_INTERVAL.NONE) {
            throw new AppError(
                'Le plan gratuit doit utiliser la périodicité none',
                409,
            );
        }

        return 0;
    }

    if (billingInterval === BILLING_INTERVAL.MONTHLY) {
        return plan.priceMonthlyExclTaxMinor;
    }

    if (billingInterval === BILLING_INTERVAL.YEARLY) {
        return plan.priceYearlyExclTaxMinor;
    }

    throw new AppError(
        'Un plan payant doit utiliser une périodicité mensuelle ou annuelle',
        409,
    );
};


/**
 * Normalise les champs de remise avant persistance.
 *
 * @param {object} updateData
 * @returns {object}
 */
const normalizeDiscount = (updateData) => {
    if (
        updateData.discountType
        !== DISCOUNT_TYPE.NONE
    ) {
        return updateData;
    }

    return {
        ...updateData,
        discountValue: 0,
        discountReason: null,
        discountEndsAt: null,
    };
};


/**
 * Normalise les champs de dérogation administrative.
 *
 * L'auteur de la dérogation est dérivé de l'acteur authentifié et ne peut
 * jamais être fourni par le client.
 *
 * @param {object} updateData
 * @param {import('mongoose').Types.ObjectId|string} actorId
 * @returns {object}
 */
const normalizeManualOverride = (
    updateData,
    actorId,
) => {
    if (updateData.manualOverride === true) {
        return {
            ...updateData,
            manualOverrideBy: actorId,
        };
    }

    if (updateData.manualOverride === false) {
        return {
            ...updateData,
            manualOverrideReason: null,
            manualOverrideBy: null,
        };
    }

    return updateData;
};


/**
 * Met à jour les propriétés administratives autorisées d'une souscription.
 *
 * Le service conserve l'instantané tarifaire de la souscription lorsqu'un
 * changement de plan ou de périodicité intervient.
 *
 * @param {object} params
 * @param {string} params.subscriptionId
 * @param {object} params.subscriptionData
 * @param {import('mongoose').Types.ObjectId|string} params.actorId
 * @param {string|null} [params.ipAddress]
 * @param {string|null} [params.userAgent]
 * @returns {Promise<object>}
 */
const updatePlatformSubscription = async ({
    subscriptionId,
    subscriptionData,
    actorId,
    ipAddress = null,
    userAgent = null,
}) => {
    if (
        !subscriptionId
        || !subscriptionData
        || !actorId
    ) {
        throw new TypeError(
            'subscriptionId, subscriptionData and actorId are required '
            + 'to update a platform subscription',
        );
    }

    let updatedSubscription;

    await mongoose.connection.transaction(async (session) => {
        const subscription =
            await Subscription.findById(subscriptionId)
                .session(session);

        if (!subscription) {
            throw new AppError(
                'Souscription introuvable',
                404,
            );
        }

        let updateData = {
            ...subscriptionData,
        };

        const planMustBeResolved =
            subscriptionData.plan !== undefined
            || subscriptionData.billingInterval !== undefined;

        let targetPlan = null;

        if (planMustBeResolved) {
            const targetPlanId =
                subscriptionData.plan
                ?? subscription.plan;

            targetPlan = await Plan.findOne({
                _id: targetPlanId,
                status: PLAN_STATUS.ACTIVE,
            }).session(session);

            if (!targetPlan) {
                throw new AppError(
                    'Le plan sélectionné est introuvable ou indisponible',
                    409,
                );
            }

            const billingInterval =
                subscriptionData.billingInterval
                ?? subscription.billingInterval;

            updateData = {
                ...updateData,
                plan: targetPlan._id,
                billingInterval,
                currency: targetPlan.currency,
                priceExclTaxMinor:
                    resolveSubscriptionPrice(
                        targetPlan,
                        billingInterval,
                    ),
            };
        }

        updateData = normalizeDiscount(updateData);

        updateData = normalizeManualOverride(
            updateData,
            actorId,
        );

        const effectiveDiscountType =
            updateData.discountType
            ?? subscription.discountType;

        const effectiveDiscountValue =
            updateData.discountValue
            ?? subscription.discountValue;

        const effectivePrice =
            updateData.priceExclTaxMinor
            ?? subscription.priceExclTaxMinor;

        if (
            effectiveDiscountType
            === DISCOUNT_TYPE.FIXED_AMOUNT
            && effectiveDiscountValue > effectivePrice
        ) {
            throw new AppError(
                'La remise fixe ne peut pas dépasser le prix HT de la souscription',
                409,
            );
        }

        updatedSubscription =
            await Subscription.findByIdAndUpdate(
                subscriptionId,
                {
                    $set: {
                        ...updateData,
                        updatedBy: actorId,
                    },
                },
                {
                    returnDocument: 'after',
                    runValidators: true,
                    session,
                },
            );

        await createAuditLog(
            {
                actor: actorId,
                action:
                    AUDIT_ACTION.SUBSCRIPTION_UPDATED,
                entityType:
                    AUDIT_ENTITY_TYPE.SUBSCRIPTION,
                entityId:
                    updatedSubscription._id,
                status:
                    AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    updatedFields:
                        Object.keys(subscriptionData),
                    previousPlanId:
                        subscription.plan?.toString()
                        ?? null,
                    newPlanId:
                        updatedSubscription.plan?.toString()
                        ?? null,
                },
            },
            { session },
        );
    });

    return {
        id: updatedSubscription._id.toString(),

        workspace:
            updatedSubscription.workspace?.toString()
            ?? null,

        plan:
            updatedSubscription.plan?.toString()
            ?? null,

        status: updatedSubscription.status,

        currentPeriodStart:
            updatedSubscription.currentPeriodStart,
        currentPeriodEnd:
            updatedSubscription.currentPeriodEnd,
        trialEndsAt:
            updatedSubscription.trialEndsAt,
        cancelAtPeriodEnd:
            updatedSubscription.cancelAtPeriodEnd,

        billingInterval:
            updatedSubscription.billingInterval,
        currency:
            updatedSubscription.currency,
        priceExclTaxMinor:
            updatedSubscription.priceExclTaxMinor,

        provider:
            updatedSubscription.provider,

        discountType:
            updatedSubscription.discountType,
        discountValue:
            updatedSubscription.discountValue,
        discountReason:
            updatedSubscription.discountReason ?? null,
        discountEndsAt:
            updatedSubscription.discountEndsAt ?? null,

        manualOverride:
            updatedSubscription.manualOverride,
        manualOverrideReason:
            updatedSubscription.manualOverrideReason
            ?? null,
        manualOverrideBy:
            updatedSubscription.manualOverrideBy?.toString()
            ?? null,

        createdAt:
            updatedSubscription.createdAt,
        updatedAt:
            updatedSubscription.updatedAt,
    };
};


export {
    updatePlatformSubscription,
};