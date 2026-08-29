import {
    resumeScheduledSubscriptionCancellation,
} from '../../../subscriptions/services/activeSubscriptionLifecycle.service.js';


/**
 * Retire une annulation programmée depuis l'administration Platform.
 *
 * La règle de reprise appartient au domaine Subscription. La couche Platform
 * ne doit pas réimplémenter les statuts autorisés ni la borne de période.
 */
const resumePlatformSubscription = async ({
    subscriptionId,
    actorId,
    ipAddress = null,
    userAgent = null,
}) => {
    if (!subscriptionId || !actorId) {
        throw new TypeError(
            'subscriptionId and actorId are required '
            + 'to resume a platform subscription',
        );
    }

    const subscription =
        await resumeScheduledSubscriptionCancellation({
            subscriptionId,
            actorId,
            ipAddress,
            userAgent,
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
    resumePlatformSubscription,
};
