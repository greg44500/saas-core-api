import {
    PLAN_KEY,
    PLAN_SYSTEM_ROLE,
} from '../constants/plan.constants.js';
import { Plan } from '../modules/plan/plan.model.js';

/**
 * Rattache le plan historique `free` au rôle système `baseline`.
 *
 * La migration utilise la collection MongoDB directement pour renseigner le
 * nouveau champ immutable sur un document déjà existant. Elle est idempotente
 * et refuse de créer silencieusement une seconde baseline.
 */
const backfillBaselinePlanSystemRole = async () => {
    const existingBaseline = await Plan.findOne({
        systemRole: PLAN_SYSTEM_ROLE.BASELINE,
    }).select('_id key');

    if (existingBaseline) {
        return {
            modified: false,
            planId: existingBaseline._id.toString(),
        };
    }

    const legacyBaseline = await Plan.findOne({
        key: PLAN_KEY.FREE,
    }).select('_id');

    if (!legacyBaseline) {
        throw new Error(
            'Le plan baseline historique est introuvable ; exécutez seedPlans avant cette migration.',
        );
    }

    const result = await Plan.collection.updateOne(
        { _id: legacyBaseline._id },
        {
            $set: {
                systemRole: PLAN_SYSTEM_ROLE.BASELINE,
            },
        },
    );

    await Plan.collection.createIndex(
        { systemRole: 1 },
        {
            name: 'uniq_plan_system_role',
            unique: true,
            partialFilterExpression: {
                systemRole: { $type: 'string' },
            },
        },
    );

    return {
        modified: result.modifiedCount === 1,
        planId: legacyBaseline._id.toString(),
    };
};

export { backfillBaselinePlanSystemRole };
