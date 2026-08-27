import {
    AppError,
} from '../../../../utils/appError.js';

import {
    Subscription,
} from '../../../subscriptions/subscription.model.js';


/**
 * Retourne le détail administratif d'une souscription.
 *
 * Le service charge les références utiles au dashboard Platform tout en
 * conservant un contrat explicite : l'absence de souscription produit un 404
 * plutôt qu'une valeur null laissée au contrôleur.
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
            select: 'email',
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

        status: subscription.status,

        currentPeriodStart:
            subscription.currentPeriodStart,
        currentPeriodEnd:
            subscription.currentPeriodEnd ?? null,
        trialEndsAt:
            subscription.trialEndsAt ?? null,
        cancelAtPeriodEnd:
            subscription.cancelAtPeriodEnd,

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