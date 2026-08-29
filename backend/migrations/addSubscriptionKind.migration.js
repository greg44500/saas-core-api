import {
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_STATUS,
} from '../constants/subscription.constants.js';

import {
    Subscription,
} from '../modules/subscriptions/subscription.model.js';


const CURRENT_SUBSCRIPTION_STATUSES = Object.freeze([
    SUBSCRIPTION_STATUS.TRIALING,
    SUBSCRIPTION_STATUS.ACTIVE,
    SUBSCRIPTION_STATUS.PAST_DUE,
]);

/**
 * Migration de données / structure MongoDB.
 *
 * Principe général :
 * une modification du modèle Mongoose ne modifie pas automatiquement les
 * documents déjà présents dans MongoDB, ni les anciens index existants.
 *
 * Lorsqu'un nouveau champ obligatoire ou structurant est ajouté au modèle,
 * il faut donc généralement :
 *
 * 1. identifier les anciens documents qui ne possèdent pas encore ce champ ;
 * 2. leur attribuer une valeur cohérente avec les règles métier existantes ;
 * 3. adapter les index MongoDB si la nouvelle structure modifie les règles
 *    d'unicité ou les stratégies de recherche ;
 * 4. rendre la migration idempotente afin qu'une seconde exécution soit sûre.
 *
 * Exemple :
 *
 * Avant :
 * {
 *     workspace: ObjectId,
 *     plan: ObjectId,
 *     status: 'active'
 * }
 *
 * Après l'ajout de `kind` :
 * {
 *     workspace: ObjectId,
 *     plan: ObjectId,
 *     kind: 'baseline',
 *     status: 'active'
 * }
 *
 * Pour une future évolution, par exemple l'ajout d'un champ `source`,
 * il ne faut pas simplement l'ajouter au Schema Mongoose si des documents
 * existent déjà.
 *
 * Il faudra créer une nouvelle migration dédiée, par exemple :
 *
 * Subscription.updateMany(
 *     {
 *         source: { $exists: false },
 *     },
 *     {
 *         $set: {
 *             source: 'system',
 *         },
 *     },
 * );
 *
 * Chaque migration doit représenter une évolution précise de la base.
 * On évite donc de modifier une ancienne migration déjà appliquée :
 * on crée une nouvelle migration pour la nouvelle évolution.
 */

const migrateSubscriptionKind = async () => {
    /*
     * Les anciennes subscriptions ne possèdent pas encore `kind`.
     * Elles correspondent au modèle historique unique du workspace
     * et deviennent donc des subscriptions baseline.
     */
    const backfillResult =
        await Subscription.collection.updateMany(
            {
                kind: {
                    $exists: false,
                },
            },
            {
                $set: {
                    kind: SUBSCRIPTION_KIND.BASELINE,
                },
            },
        );

    const indexes = await Subscription.collection.indexes();

    /*
     * Ancien index :
     * { workspace: 1 }
     *
     * Il empêchait plusieurs subscriptions courantes pour un workspace.
     */
    const legacyIndex = indexes.find((index) =>
        index.unique === true
        && index.key?.workspace === 1
        && Object.keys(index.key).length === 1
        && Boolean(index.partialFilterExpression?.status),
    );

    /*
     * Nouvel index :
     * { workspace: 1, kind: 1 }
     *
     * Il permet une baseline et une commercial simultanément,
     * tout en garantissant l'unicité de chaque type.
     */
    const targetIndexExists = indexes.some((index) =>
        index.unique === true
        && index.key?.workspace === 1
        && index.key?.kind === 1
        && Object.keys(index.key).length === 2,
    );

    if (legacyIndex) {
        await Subscription.collection.dropIndex(
            legacyIndex.name,
        );
    }

    if (!targetIndexExists) {
        await Subscription.collection.createIndex(
            {
                workspace: 1,
                kind: 1,
            },
            {
                unique: true,
                partialFilterExpression: {
                    status: {
                        $in: CURRENT_SUBSCRIPTION_STATUSES,
                    },
                },
            },
        );
    }

    return {
        matchedSubscriptions:
            backfillResult.matchedCount,
        modifiedSubscriptions:
            backfillResult.modifiedCount,
        legacyIndexRemoved:
            Boolean(legacyIndex),
        targetIndexCreated:
            !targetIndexExists,
    };
};


export {
    migrateSubscriptionKind,
};