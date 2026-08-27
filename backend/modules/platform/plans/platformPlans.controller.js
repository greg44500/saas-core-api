import {
    listPlatformPlans,
} from './services/listPlatformPlans.service.js';


const serializePlanLimits = (limits) => {
    if (limits instanceof Map) {
        return Object.fromEntries(limits);
    }

    return limits ?? {};
};


/**
 * Retourne le catalogue administratif des plans.
 *
 * Le contrôleur construit explicitement le DTO afin de ne pas exposer
 * accidentellement un futur champ interne ajouté au modèle Plan.
 */
const listPlans = async (req, res) => {
    const { plans, pagination } = await listPlatformPlans({
        page: req.validated.query.page,
        limit: req.validated.query.limit,
    });

    res.status(200).json({
        status: 'success',
        data: {
            plans: plans.map((plan) => ({
                id: plan._id.toString(),
                key: plan.key,
                name: plan.name,
                description: plan.description ?? null,
                status: plan.status,
                isPublic: plan.isPublic,
                displayOrder: plan.displayOrder,
                currency: plan.currency,
                priceMonthlyExclTaxMinor:
                    plan.priceMonthlyExclTaxMinor,
                priceYearlyExclTaxMinor:
                    plan.priceYearlyExclTaxMinor,
                features: plan.features,
                limits: serializePlanLimits(plan.limits),
                createdBy: plan.createdBy?.toString() ?? null,
                updatedBy: plan.updatedBy?.toString() ?? null,
                createdAt: plan.createdAt,
                updatedAt: plan.updatedAt,
            })),
        },
        meta: pagination,
    });
};


export { listPlans };
