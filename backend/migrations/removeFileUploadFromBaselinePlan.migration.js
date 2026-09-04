import {
    PLAN_SYSTEM_ROLE,
} from '../constants/plan.constants.js';
import {
    CORE_PLAN_FEATURE,
} from '../modules/plan/planCapability.registry.js';
import { Plan } from '../modules/plan/plan.model.js';


/**
 * Réconcilie les anciennes données du Plan baseline avec la règle actuelle :
 * aucune feature n'est accordée par défaut par le socle initial.
 *
 * Cette migration retire uniquement `file_upload` lorsqu'il est encore présent
 * dans un Plan historique. Les autres features éventuelles et toutes les
 * limites restent intactes : les quotas d'upload pourront donc servir de socle
 * si un EntitlementOverride accorde ensuite cette feature à un workspace.
 *
 * Le Plan est identifié exclusivement par son rôle système. Son nom commercial
 * et sa clé technique ne participent pas à la décision métier.
 */
const removeFileUploadFromBaselinePlan = async () => {
    const baselinePlan = await Plan.findOne({
        systemRole: PLAN_SYSTEM_ROLE.BASELINE,
    }).select('_id features');

    if (!baselinePlan) {
        throw new Error(
            'Le Plan baseline est introuvable ; exécutez la migration du rôle système et le seed des plans avant cette réconciliation.',
        );
    }

    const planId = baselinePlan._id.toString();
    const features = baselinePlan.features ?? [];

    if (!features.includes(CORE_PLAN_FEATURE.FILE_UPLOAD)) {
        return {
            modified: false,
            planId,
        };
    }

    const result = await Plan.collection.updateOne(
        {
            _id: baselinePlan._id,
            systemRole: PLAN_SYSTEM_ROLE.BASELINE,
        },
        {
            $pull: {
                features: CORE_PLAN_FEATURE.FILE_UPLOAD,
            },
        },
    );

    if (result.matchedCount !== 1) {
        throw new Error(
            'Le Plan baseline n’a pas pu être réconcilié.',
        );
    }

    return {
        modified: result.modifiedCount === 1,
        planId,
    };
};


export { removeFileUploadFromBaselinePlan };
