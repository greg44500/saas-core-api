import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import {
    SUBSCRIPTION_STATUS,
} from '../constants/subscription.constants.js';
import {
    Subscription,
} from '../modules/subscriptions/subscription.model.js';

import {
    migrateSubscriptionKind,
} from './addSubscriptionKind.migration.js';


const SUBSCRIPTION_KIND_TARGET_INDEX = Object.freeze({
    key: Object.freeze({
        workspace: 1,
        kind: 1,
    }),
    options: Object.freeze({
        unique: true,
        partialFilterExpression: Object.freeze({
            status: Object.freeze({
                $in: Object.freeze([
                    SUBSCRIPTION_STATUS.TRIALING,
                    SUBSCRIPTION_STATUS.ACTIVE,
                    SUBSCRIPTION_STATUS.PAST_DUE,
                ]),
            }),
        }),
    }),
});


/**
 * Garantit que la contrainte cible existe avant que la migration historique
 * puisse supprimer l'ancien index workspace-only.
 *
 * La migration métier reste volontairement immuable. Le runner porte le
 * durcissement opérationnel afin qu'un échec de création d'index ne laisse
 * jamais la collection sans la contrainte d'unicité attendue.
 */
const ensureSubscriptionKindTargetIndex = async () => {
    const indexes = await Subscription.collection.indexes();

    const existingTargetKeyIndex = indexes.find(
        (index) => isDeepStrictEqual(
            index.key,
            SUBSCRIPTION_KIND_TARGET_INDEX.key,
        ),
    );

    if (existingTargetKeyIndex) {
        const hasExpectedOptions = (
            existingTargetKeyIndex.unique === true
            && isDeepStrictEqual(
                existingTargetKeyIndex.partialFilterExpression,
                SUBSCRIPTION_KIND_TARGET_INDEX.options
                    .partialFilterExpression,
            )
        );

        if (!hasExpectedOptions) {
            throw new Error(
                'Un index workspace + kind existe avec des options incompatibles ; intervention manuelle requise.',
            );
        }

        return {
            created: false,
        };
    }

    await Subscription.collection.createIndex(
        SUBSCRIPTION_KIND_TARGET_INDEX.key,
        SUBSCRIPTION_KIND_TARGET_INDEX.options,
    );

    return {
        created: true,
    };
};


const runAddSubscriptionKindMigration = async () => {
    try {
        await connectDB(env.MONGODB_URI);

        const preflight = await ensureSubscriptionKindTargetIndex();
        const result = await migrateSubscriptionKind();

        console.log(
            'Migration addSubscriptionKind terminée :',
            {
                ...result,
                targetIndexPrecreated: preflight.created,
            },
        );
    } catch (error) {
        console.error(
            'Échec de la migration addSubscriptionKind :',
            { message: error.message },
        );

        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};


const isExecutedDirectly = (
    process.argv[1]
    && import.meta.url === pathToFileURL(process.argv[1]).href
);

if (isExecutedDirectly) {
    runAddSubscriptionKindMigration();
}


export {
    ensureSubscriptionKindTargetIndex,
    runAddSubscriptionKindMigration,
    SUBSCRIPTION_KIND_TARGET_INDEX,
};
