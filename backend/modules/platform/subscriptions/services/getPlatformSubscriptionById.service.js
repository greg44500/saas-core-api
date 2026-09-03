import {
    AppError,
} from '../../../../utils/appError.js';

import {
    Subscription,
} from '../../../subscriptions/subscription.model.js';


/**
 * Retourne le détail administratif d'une souscription.
 *
 * Le contrat HTTP est construit explicitement afin qu'une évolution du modèle
 * Mongoose ne puisse pas exposer silencieusement de nouveaux champs. Les
 * références utiles à l'administration sont résolues avec des projections
 * minimales.
 *
 * @param {object} params
 * @param {string} params.subscriptionId
 * @returns {Promise<object>}
 */
const getPlatformSubscriptionById = async ({
    subscriptionId,
}) => {
    if (!subscriptionId) {
        throw new TypeError(
            'subscriptionId is required '
            + 'to retrieve a platform subscription',
        );
    }

    const subscription = await Subscription
        .findById(subscriptionId)
        .select(
            '_id workspace plan kind status '
            + 'currentPeriodStart currentPeriodEnd trialEndsAt '
            + 'cancelAtPeriodEnd scheduledChange '
            + 'billingInterval currency priceExclTaxMinor '
            + 'provider providerCustomerId providerSubscriptionId '
            + 'discountType discountValue discountReason discountEndsAt '
            + 'manualOverride manualOverrideReason manualOverrideBy '
            + 'createdBy updatedBy createdAt updatedAt',
        )
        .populate({
            path: 'workspace',
            select: 'name',
        })
        .populate({
            path: 'plan',
            select: 'key name status',
        })
        .populate({
            path: 'manualOverrideBy',
            select: 'firstName lastName email',
        })
        .populate({
            path: 'scheduledChange.targetPlan',
            select: 'key name',
        })
        .populate({
            path: 'scheduledChange.requestedBy',
            select: 'firstName lastName email',
        })
        .lean();

    if (!subscription) {
        throw new AppError(
            'Souscription introuvable',
            404,
        );
    }

    return {
        id: subscription._id.toString(),

        workspace: subscription.workspace
            ? {
                id:
                    subscription.workspace._id
                        .toString(),
                name:
                    subscription.workspace.name,
            }
            : null,

        plan: subscription.plan
            ? {
                id:
                    subscription.plan._id
                        .toString(),
                key:
                    subscription.plan.key,
                name:
                    subscription.plan.name,
                status:
                    subscription.plan.status,
            }
            : null,

        kind: subscription.kind,
        status: subscription.status,

        currentPeriodStart:
            subscription.currentPeriodStart,
        currentPeriodEnd:
            subscription.currentPeriodEnd ?? null,
        trialEndsAt:
            subscription.trialEndsAt ?? null,
        cancelAtPeriodEnd:
            subscription.cancelAtPeriodEnd,

        scheduledChange: subscription.scheduledChange
            ? {
                type:
                    subscription.scheduledChange.type,
                targetPlan:
                    subscription.scheduledChange.targetPlan
                        ? {
                            id:
                                subscription.scheduledChange.targetPlan._id
                                    .toString(),
                            key:
                                subscription.scheduledChange.targetPlan.key,
                            name:
                                subscription.scheduledChange.targetPlan.name,
                        }
                        : null,
                targetBillingInterval:
                    subscription.scheduledChange.targetBillingInterval,
                targetCurrency:
                    subscription.scheduledChange.targetCurrency,
                targetPriceExclTaxMinor:
                    subscription.scheduledChange.targetPriceExclTaxMinor,
                effectiveAt:
                    subscription.scheduledChange.effectiveAt,
                requestedAt:
                    subscription.scheduledChange.requestedAt,
                requestedBy:
                    subscription.scheduledChange.requestedBy
                        ? {
                            id:
                                subscription.scheduledChange.requestedBy._id
                                    .toString(),
                            firstName:
                                subscription.scheduledChange.requestedBy.firstName,
                            lastName:
                                subscription.scheduledChange.requestedBy.lastName,
                            email:
                                subscription.scheduledChange.requestedBy.email,
                        }
                        : null,
            }
            : null,

        billingInterval:
            subscription.billingInterval,
        currency:
            subscription.currency,
        priceExclTaxMinor:
            subscription.priceExclTaxMinor,

        provider:
            subscription.provider,
        providerCustomerId:
            subscription.providerCustomerId ?? null,
        providerSubscriptionId:
            subscription.providerSubscriptionId ?? null,

        discountType:
            subscription.discountType,
        discountValue:
            subscription.discountValue,
        discountReason:
            subscription.discountReason ?? null,
        discountEndsAt:
            subscription.discountEndsAt ?? null,

        manualOverride:
            subscription.manualOverride,
        manualOverrideReason:
            subscription.manualOverrideReason ?? null,

        manualOverrideBy:
            subscription.manualOverrideBy
                ? {
                    id:
                        subscription.manualOverrideBy._id
                            .toString(),
                    firstName:
                        subscription.manualOverrideBy.firstName,
                    lastName:
                        subscription.manualOverrideBy.lastName,
                    email:
                        subscription.manualOverrideBy.email,
                }
                : null,

        createdBy:
            subscription.createdBy?.toString()
            ?? null,

        updatedBy:
            subscription.updatedBy?.toString()
            ?? null,

        createdAt:
            subscription.createdAt,

        updatedAt:
            subscription.updatedAt,
    };
};


export {
    getPlatformSubscriptionById,
};