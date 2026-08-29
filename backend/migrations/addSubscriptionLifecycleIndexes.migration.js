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
 * des index opérationnels. Cette migration reste idempotente et peut donc être
 * rejouée après l'ajout d'un nouveau job de maintenance.
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

    const scheduledDowngradeKey = {
        kind: 1,
        status: 1,
        'scheduledChange.type': 1,
        'scheduledChange.effectiveAt': 1,
    };

    const trialExpirationExists = hasExactIndex(indexes, trialExpirationKey);
    const scheduledCancellationExists = hasExactIndex(indexes, scheduledCancellationKey);
    const scheduledDowngradeExists = hasExactIndex(indexes, scheduledDowngradeKey);

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

    if (!scheduledDowngradeExists) {
        await Subscription.collection.createIndex(
            scheduledDowngradeKey,
            { name: 'subscription_scheduled_downgrade_lookup' },
        );
    }

    return {
        trialExpirationIndexCreated: !trialExpirationExists,
        scheduledCancellationIndexCreated: !scheduledCancellationExists,
        scheduledDowngradeIndexCreated: !scheduledDowngradeExists,
    };
};

export { migrateSubscriptionLifecycleIndexes };
