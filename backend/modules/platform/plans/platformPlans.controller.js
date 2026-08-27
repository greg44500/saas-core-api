import {
    createPlatformPlan,
} from './services/createPlatformPlan.service.js';

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
 * Crée un nouveau plan depuis l'administration Platform.
 *
 * La requête a déjà été validée par le middleware Zod avant d'atteindre
 * le contrôleur. Celui-ci reste donc volontairement limité à l'orchestration
 * HTTP et délègue toute logique métier au service Platform.
 */
const createPlan = async (req, res) => {
    const plan = await createPlatformPlan({
        planData: req.validated.body,
        actorId: req.user._id,
        ipAddress: req.context?.ipAddress ?? null,
        userAgent: req.context?.userAgent ?? null,
    });

    res.status(201).json({
        status: 'success',
        data: {
            plan,
        },
    });
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


export {
    createPlan,
    listPlans,
};