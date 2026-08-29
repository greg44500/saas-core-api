import { Subscription } from '../modules/subscriptions/subscription.model.js';


const hasExactIndex = (indexes, expectedKey) => indexes.some((index) => {
    const keys = Object.keys(index.key ?? {});
    const expectedKeys = Object.keys(expectedKey);

    return keys.length === expectedKeys.length
        && expectedKeys.every(
            (key) => index.key?.[key] === expectedKey[key],
        );
});


/**
 * Provisionne explicitement les index utilisés par les jobs de cycle de vie.
 *
 * Une production ne doit pas dépendre de `autoIndex` de Mongoose pour créer
 * des index opérationnels. Cette migration est idempotente et couvre aussi
 * l'index d'expiration des trials introduit avant ce lot.
 */
const migrateSubscriptionLifecycleIndexes = async () => {
    const indexes = await Subscription.collection.indexes();

    const trialExpirationKey = {
        kind: 1,
        status: 1,
        trialEndsAt: 1,
    };

    const scheduledCancellationKey = {
        kind: 1,
        status: 1,
        cancelAtPeriodEnd: 1,
        currentPeriodEnd: 1,
    };

    const trialExpirationExists = hasExactIndex(
        indexes,
        trialExpirationKey,
    );

    const scheduledCancellationExists = hasExactIndex(
        indexes,
        scheduledCancellationKey,
    );

    if (!trialExpirationExists) {
        await Subscription.collection.createIndex(
            trialExpirationKey,
            { name: 'subscription_trial_expiration_lookup' },
        );
    }

    if (!scheduledCancellationExists) {
        await Subscription.collection.createIndex(
            scheduledCancellationKey,
            { name: 'subscription_scheduled_cancellation_lookup' },
        );
    }

    return {
        trialExpirationIndexCreated: !trialExpirationExists,
        scheduledCancellationIndexCreated:
            !scheduledCancellationExists,
    };
};


export { migrateSubscriptionLifecycleIndexes };
