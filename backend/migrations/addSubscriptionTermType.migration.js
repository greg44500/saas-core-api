import {
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_TERM_TYPE,
} from '../constants/subscription.constants.js';

import {
    Subscription,
} from '../modules/subscriptions/subscription.model.js';


/**
 * Backfill le contrat temporel explicite ajouté par D-020.
 *
 * Les Subscriptions historiques existaient avant `termType`. Leur rôle
 * fonctionnel `kind` permet une conversion déterministe : baseline = accès
 * open-ended, commerciale = contrat fixed. La migration refuse de deviner pour
 * un document sans `kind` valide afin de ne jamais élargir des droits par
 * défaut.
 *
 * La migration est idempotente : seuls les documents sans `termType` sont
 * modifiés.
 */
const migrateSubscriptionTermType = async () => {
    const unresolvedSubscriptions = await Subscription.collection.countDocuments({
        termType: { $exists: false },
        kind: {
            $nin: [
                SUBSCRIPTION_KIND.BASELINE,
                SUBSCRIPTION_KIND.COMMERCIAL,
            ],
        },
    });

    if (unresolvedSubscriptions > 0) {
        throw new Error(
            'Certaines souscriptions sans termType ne possèdent pas un kind exploitable. Exécutez ou réparez d’abord la migration subscription-kind.',
        );
    }

    const baselineResult = await Subscription.collection.updateMany(
        {
            termType: { $exists: false },
            kind: SUBSCRIPTION_KIND.BASELINE,
        },
        {
            $set: {
                termType: SUBSCRIPTION_TERM_TYPE.OPEN_ENDED,
            },
        },
    );

    const commercialResult = await Subscription.collection.updateMany(
        {
            termType: { $exists: false },
            kind: SUBSCRIPTION_KIND.COMMERCIAL,
        },
        {
            $set: {
                termType: SUBSCRIPTION_TERM_TYPE.FIXED,
            },
        },
    );

    return {
        baselineMatched: baselineResult.matchedCount,
        baselineModified: baselineResult.modifiedCount,
        commercialMatched: commercialResult.matchedCount,
        commercialModified: commercialResult.modifiedCount,
    };
};


export {
    migrateSubscriptionTermType,
};
