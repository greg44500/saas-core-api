import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';

import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';

import {
    PLAN_KEY,
    PLAN_STATUS,
} from '../constants/plan.constants.js';

import { Plan } from '../modules/plan/plan.model.js';
import { createPlan } from '../modules/plan/plan.service.js';


/**
 * Définition initiale du plan gratuit fourni par le socle SaaS.
 *
 * Les plans payants seront ajoutés lorsque leur politique tarifaire,
 * leurs fonctionnalités et leurs limites auront été définies.
 */
const INITIAL_PLAN_DEFINITIONS = Object.freeze([
    Object.freeze({
        key: PLAN_KEY.FREE,
        name: 'Free',
        description: 'Plan gratuit de découverte.',
        status: PLAN_STATUS.ACTIVE,
        isPublic: true,
        displayOrder: 0,

        // Les prix sont stockés en unités monétaires mineures.
        currency: 'EUR',
        priceMonthlyExclTaxMinor: 0,
        priceYearlyExclTaxMinor: 0,

        features: Object.freeze([
            'file_upload',
        ]),

        limits: Object.freeze({
            members: 1,

            // 100 Mio exprimés en octets.
            storage_bytes: 100 * 1024 * 1024,

            file_uploads_monthly: 10,
        }),
    }),
]);


/**
 * Crée les plans initiaux absents de la base de données.
 *
 * Le seed est idempotent : une seconde exécution ne recrée pas un plan
 * possédant déjà la même clé fonctionnelle.
 *
 * La création passe par PlanService afin de ne pas contourner la validation
 * fonctionnelle des features et des métriques.
 *
 * @returns {Promise<{
 *     created: string[],
 *     skipped: string[]
 * }>}
 */
const seedPlans = async () => {
    const result = {
        created: [],
        skipped: [],
    };

    for (const planDefinition of INITIAL_PLAN_DEFINITIONS) {
        const existingPlan = await Plan.findOne({
            key: planDefinition.key,
        });

        if (existingPlan) {
            result.skipped.push(planDefinition.key);
            continue;
        }

        await createPlan({
            planData: planDefinition,

            // null indique une création réalisée par le système.
            actorId: null,
        });

        result.created.push(planDefinition.key);
    }

    return result;
};


/**
 * Ouvre la connexion MongoDB, exécute le seed puis ferme proprement
 * la connexion afin que le processus Node.js puisse se terminer.
 */
const runSeedPlans = async () => {
    await connectDB(env.MONGODB_URI);

    try {
        const result = await seedPlans();

        console.log(
            `Plans créés : ${result.created.length}`,
        );

        console.log(
            `Plans déjà présents : ${result.skipped.length}`,
        );
    } finally {
        await mongoose.disconnect();
    }
};


/**
 * Empêche l'exécution automatique du seed lorsqu'il est simplement importé
 * par Vitest ou par un autre module.
 */
const isExecutedDirectly =
    process.argv[1]
    && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isExecutedDirectly) {
    runSeedPlans().catch((error) => {
        console.error(
            'Échec de la création des plans initiaux :',
            error,
        );

        process.exitCode = 1;
    });
}


export {
    INITIAL_PLAN_DEFINITIONS,
    runSeedPlans,
    seedPlans,
};