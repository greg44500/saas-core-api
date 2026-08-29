import {
    SUBSCRIPTION_CANCELLATION_MODE,
} from '../../../../constants/subscription.constants.js';

import {
    cancelActiveSubscriptionImmediately,
    scheduleActiveSubscriptionCancellation,
} from '../../../subscriptions/services/activeSubscriptionLifecycle.service.js';


/**
 * Annule une souscription commerciale active depuis l'administration Platform.
 *
 * La couche Platform porte l'autorisation et le motif administratif. Les
 * invariants de cycle de vie restent centralisés dans le domaine Subscription
 * afin qu'une future route client et l'administration ne puissent pas appliquer
 * des règles différentes.
 */
const cancelPlatformSubscription = async ({
    subscriptionId,
    mode,
    reason,
    actorId,
    ipAddress = null,
    userAgent = null,
}) => {
    if (
        !subscriptionId
        || !mode
        || !reason
        || !actorId
    ) {
        throw new TypeError(
            'subscriptionId, mode, reason and actorId are required '
            + 'to cancel a platform subscription',
        );
    }

    const commonParams = {
        subscriptionId,
        actorId,
        ipAddress,
        userAgent,
    };

    const subscription = mode
        === SUBSCRIPTION_CANCELLATION_MODE.IMMEDIATE
        ? await cancelActiveSubscriptionImmediately({
            ...commonParams,
            reason,
        })
        : await scheduleActiveSubscriptionCancellation({
            ...commonParams,
            reason,
        });

    return {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd:
            subscription.cancelAtPeriodEnd,
        currentPeriodEnd:
            subscription.currentPeriodEnd,
        updatedAt:
            subscription.updatedAt,
    };
};


export {
    cancelPlatformSubscription,
};
