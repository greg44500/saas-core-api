import {
    ACTIVE_PLAN_CAPABILITY_REGISTRY,
} from '../../config/applicationCapability.registry.js';
import {
    PLAN_STATUS,
    PLAN_SYSTEM_ROLE,
} from '../../constants/plan.constants.js';
import { AppError } from '../../utils/appError.js';
import { Plan } from './plan.model.js';

const getLimitKeys = (limits) => {
    if (limits instanceof Map) {
        return [...limits.keys()];
    }

    if (
        limits
        && typeof limits === 'object'
        && !Array.isArray(limits)
    ) {
        return Object.keys(limits);
    }

    return [];
};

/**
 * Le rôle système est l'unique autorité métier pour identifier la baseline.
 * Le nom commercial et la clé technique restent sans influence sur ce rôle.
 */
const isBaselinePlan = (plan) => Boolean(
    plan
    && plan.systemRole === PLAN_SYSTEM_ROLE.BASELINE
);

const validatePlanCapabilities = (
    planData,
    registry = ACTIVE_PLAN_CAPABILITY_REGISTRY,
) => {
    const features = planData?.features ?? [];
    const limits = planData?.limits ?? {};

    const unknownFeatures = features.filter(
        (feature) => !registry.features.has(feature),
    );

    if (unknownFeatures.length > 0) {
        throw new AppError(
            `Fonctionnalités de plan inconnues : ${unknownFeatures.join(', ')}.`,
            400,
        );
    }

    const limitKeys = getLimitKeys(limits);
    const unknownMetrics = limitKeys.filter(
        (metric) => !registry.metrics.has(metric),
    );

    if (unknownMetrics.length > 0) {
        throw new AppError(
            `Métriques de plan inconnues : ${unknownMetrics.join(', ')}.`,
            400,
        );
    }

    if (Object.hasOwn(planData ?? {}, 'limits')) {
        const configuredMetrics = new Set(limitKeys);
        const missingMetrics = [...registry.metrics].filter(
            (metric) => !configuredMetrics.has(metric),
        );

        if (missingMetrics.length > 0) {
            throw new AppError(
                `Limites de plan non configurées : ${missingMetrics.join(', ')}.`,
                400,
            );
        }
    }
};

const createPlan = async ({
    planData,
    actorId = null,
    registry = ACTIVE_PLAN_CAPABILITY_REGISTRY,
    session,
}) => {
    validatePlanCapabilities(
        {
            ...planData,
            limits: planData?.limits ?? {},
        },
        registry,
    );

    const plan = new Plan({
        ...planData,
        createdBy: actorId,
        updatedBy: actorId,
    });

    const saveOptions = session
        ? { session }
        : undefined;

    return plan.save(saveOptions);
};

const listPublicPlans = async () => {
    return Plan.find({
        status: PLAN_STATUS.ACTIVE,
        isPublic: true,
    })
        .select([
            'systemRole',
            'name',
            'description',
            'displayOrder',
            'trialEnabled',
            'trialDurationDays',
            'currency',
            'priceMonthlyExclTaxMinor',
            'priceYearlyExclTaxMinor',
            'features',
            'limits',
        ].join(' '))
        .sort({
            displayOrder: 1,
            name: 1,
        })
        .lean();
};

export {
    createPlan,
    isBaselinePlan,
    listPublicPlans,
    validatePlanCapabilities,
};
