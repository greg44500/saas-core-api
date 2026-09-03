import {
    ACTIVE_PLAN_CAPABILITY_REGISTRY,
} from '../../config/applicationCapability.registry.js';
import { PLAN_STATUS } from '../../constants/plan.constants.js';
import {
    USAGE_METRIC_BEHAVIOR,
} from '../../constants/usageMetric.constants.js';
import { AppError } from '../../utils/appError.js';
import {
    getUsageMetricValue,
} from '../usageMetric/usageMetric.service.js';
import { Plan } from './plan.model.js';


const isValidDate = (value) =>
    value instanceof Date
    && !Number.isNaN(value.getTime());

const getPlanLimitEntries = (limits) => {
    if (limits instanceof Map) {
        return [...limits.entries()];
    }

    if (
        limits
        && typeof limits === 'object'
        && !Array.isArray(limits)
    ) {
        return Object.entries(limits);
    }

    return [];
};

const assertCompatibilityMetricDefinition = (
    metricKey,
    definition,
) => {
    if (!definition) {
        throw new TypeError(
            `No metric definition found for plan compatibility: "${metricKey}"`,
        );
    }

    if (
        !Object.values(USAGE_METRIC_BEHAVIOR)
            .includes(definition.behavior)
        || typeof definition.remediationRequired !== 'boolean'
    ) {
        throw new TypeError(
            `Metric "${metricKey}" is missing plan compatibility semantics`,
        );
    }
};

/**
 * Analyse l'utilisation réelle d'un workspace face aux limites d'un plan
 * cible sans modifier ni le plan, ni la Subscription, ni UsageMetric.
 *
 * Le registre actif de l'application est utilisé par défaut afin qu'une
 * métrique métier déclarée après clonage soit interprétée par le même moteur
 * de compatibilité que les métriques Core.
 */
const assessWorkspacePlanCompatibility = async ({
    workspaceId,
    targetPlanId,
    at = new Date(),
    registry = ACTIVE_PLAN_CAPABILITY_REGISTRY,
    session = null,
}) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to assess plan compatibility',
        );
    }

    if (!targetPlanId) {
        throw new TypeError(
            'targetPlanId is required to assess plan compatibility',
        );
    }

    if (!isValidDate(at)) {
        throw new TypeError('at must be a valid Date');
    }

    if (
        !registry
        || typeof registry.getMetricDefinition !== 'function'
    ) {
        throw new TypeError(
            'registry must provide getMetricDefinition()',
        );
    }

    let query = Plan.findById(targetPlanId)
        .select('key name status limits');

    if (session) {
        query = query.session(session);
    }

    const targetPlan = await query.lean();

    if (!targetPlan) {
        throw new AppError('Plan cible introuvable.', 404);
    }

    if (targetPlan.status !== PLAN_STATUS.ACTIVE) {
        throw new AppError(
            'Le plan cible doit être actif.',
            409,
        );
    }

    const finiteLimits = getPlanLimitEntries(targetPlan.limits)
        .filter(([, limit]) => limit !== null);

    const exceededLimits = (
        await Promise.all(
            finiteLimits.map(async ([metricKey, limit]) => {
                const definition =
                    registry.getMetricDefinition(metricKey);

                assertCompatibilityMetricDefinition(
                    metricKey,
                    definition,
                );

                const usage = await getUsageMetricValue({
                    workspaceId,
                    metricKey,
                    at,
                    registry,
                    session,
                });

                if (usage <= limit) {
                    return null;
                }

                return {
                    key: metricKey,
                    usage,
                    limit,
                    excess: usage - limit,
                    periodType: definition.periodType,
                    behavior: definition.behavior,
                    remediationRequired:
                        definition.remediationRequired,
                };
            }),
        )
    ).filter(Boolean);

    const blockingLimits = exceededLimits.filter(
        ({ remediationRequired }) => remediationRequired,
    );

    const nonBlockingLimits = exceededLimits.filter(
        ({ remediationRequired }) => !remediationRequired,
    );

    return {
        compatible: blockingLimits.length === 0,
        hasExceededLimits: exceededLimits.length > 0,
        targetPlan: {
            id: targetPlan._id.toString(),
            key: targetPlan.key,
            name: targetPlan.name,
        },
        blockingLimits,
        nonBlockingLimits,
    };
};


export {
    assessWorkspacePlanCompatibility,
};
