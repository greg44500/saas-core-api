import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';

import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import { createPlan } from '../modules/plans/plan.service.js';
import { getInitialPlanDefinitions } from '../modules/plans/plan.registry.js';
import { Plan } from '../modules/plans/plan.model.js';


const INITIAL_PLAN_DEFINITIONS = getInitialPlanDefinitions();


/**
 * Crée les plans système absents sans modifier les plans déjà présents.
 *
 * Le seed est volontairement idempotent : il peut être rejoué sans écraser
 * une configuration commerciale éventuellement administrée après le bootstrap.
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
            ...planDefinition,

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
            { message: error.message },
        );

        process.exitCode = 1;
    });
}


export {
    INITIAL_PLAN_DEFINITIONS,
    runSeedPlans,
    seedPlans,
};
