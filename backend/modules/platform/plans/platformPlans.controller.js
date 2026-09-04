import {
    isBaselinePlan,
} from '../../plan/plan.service.js';
import {
    createPlatformPlan,
} from './services/createPlatformPlan.service.js';
import {
    updatePlatformPlan,
} from './services/updatePlatformPlan.service.js';
import {
    archivePlatformPlan,
} from './services/archivePlatformPlan.service.js';
import {
    listPlatformPlans,
} from './services/listPlatformPlans.service.js';

const serializePlanLimits = (limits) => {
    if (limits instanceof Map) {
        return Object.fromEntries(limits);
    }

    return limits ?? {};
};

const createPlan = async (req, res) => {
    const plan = await createPlatformPlan({
        planData: req.validated.body,
        actorId: req.user._id,
        ipAddress: req.context?.ipAddress ?? null,
        userAgent: req.context?.userAgent ?? null,
    });

    res.status(201).json({
        status: 'success',
        data: { plan },
    });
};

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
                isBaseline: isBaselinePlan(plan),
                name: plan.name,
                description: plan.description ?? null,
                status: plan.status,
                isPublic: plan.isPublic,
                displayOrder: plan.displayOrder,
                trialEnabled: plan.trialEnabled,
                trialDurationDays: plan.trialDurationDays ?? null,
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

const updatePlan = async (req, res) => {
    const plan = await updatePlatformPlan({
        planId: req.validated.params.planId,
        planData: req.validated.body,
        actorId: req.user._id,
        ipAddress: req.context?.ipAddress ?? null,
        userAgent: req.context?.userAgent ?? null,
    });

    res.status(200).json({
        status: 'success',
        data: { plan },
    });
};

const archivePlan = async (req, res) => {
    const plan = await archivePlatformPlan({
        planId: req.validated.params.planId,
        actorId: req.user._id,
        ipAddress: req.context?.ipAddress ?? null,
        userAgent: req.context?.userAgent ?? null,
    });

    res.status(200).json({
        status: 'success',
        data: { plan },
    });
};

export {
    createPlan,
    updatePlan,
    archivePlan,
    listPlans,
};
