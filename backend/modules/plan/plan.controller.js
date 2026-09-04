import {
    PLAN_KEY,
    PLAN_SYSTEM_ROLE,
} from '../../constants/plan.constants.js';
import {
    listPublicPlans,
} from './plan.service.js';

const serializePlanLimits = (limits) => {
    if (limits instanceof Map) {
        return Object.fromEntries(limits);
    }

    return limits ?? {};
};

const isBaselinePlan = (plan) => (
    plan?.systemRole === PLAN_SYSTEM_ROLE.BASELINE
    || plan?.key === PLAN_KEY.FREE
);

/**
 * Retourne le catalogue actif et public sans exposer l'identifiant technique
 * interne du Plan. Le frontend reçoit uniquement la sémantique nécessaire :
 * `isBaseline` indique l'offre de référence sans dépendre de son nom.
 */
const list = async (req, res) => {
    const plans = await listPublicPlans();

    res.status(200).json({
        status: 'success',
        data: {
            plans: plans.map((plan) => ({
                id: plan._id.toString(),
                isBaseline: isBaselinePlan(plan),
                name: plan.name,
                description: plan.description,
                displayOrder: plan.displayOrder,
                currency: plan.currency,
                priceMonthlyExclTaxMinor:
                    plan.priceMonthlyExclTaxMinor,
                priceYearlyExclTaxMinor:
                    plan.priceYearlyExclTaxMinor,
                trialEnabled: plan.trialEnabled,
                trialDurationDays: plan.trialDurationDays,
                features: plan.features,
                limits: serializePlanLimits(plan.limits),
            })),
        },
    });
};

export { list };
