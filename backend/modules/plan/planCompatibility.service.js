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

const getLimitEntries = (limits) => {
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

    throw new TypeError(
        'limits must be a Map or a plain object',
    );
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
 * Compare l'usage réel d'un Workspace à un ensemble de limites déjà résolues.
 *
 * Cette primitive ne connaît ni Plan ni EntitlementOverride. Elle reçoit la
 * décision commerciale finale sous forme de limites et reste donc réutilisable
 * pour un Plan cible ou pour l'entitlement effectif courant.
 *
 * Les limites `null` sont illimitées et n'entraînent aucune lecture d'usage.
 * Une métrique absente n'est pas inventée ici : la complétude du catalogue et
 * la résolution d'une métrique précise restent contrôlées par leurs services
 * propriétaires.
 *
 * Lorsque `session` est fournie, les lectures sont volontairement séquentielles
 * pour ne pas exécuter plusieurs opérations concurrentes sur une même session
 * transactionnelle MongoDB. Hors transaction, elles restent parallélisées.
 */
const assessWorkspaceLimitsCompatibility = async ({
    workspaceId,
    limits,
    at = new Date(),
    registry = ACTIVE_PLAN_CAPABILITY_REGISTRY,
    session = null,
}) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to assess limits compatibility',
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

    const finiteLimits = getLimitEntries(limits)
        .filter(([, limit]) => limit !== null);

    const measureExceededLimit = async ([metricKey, limit]) => {
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
    };

    let measuredLimits;

    if (session) {
        measuredLimits = [];

        for (const limitEntry of finiteLimits) {
            measuredLimits.push(
                await measureExceededLimit(limitEntry),
            );
        }
    } else {
        measuredLimits = await Promise.all(
            finiteLimits.map(measureExceededLimit),
        );
    }

    const exceededLimits = measuredLimits.filter(Boolean);

    const blockingLimits = exceededLimits.filter(
        ({ remediationRequired }) => remediationRequired,
    );

    const nonBlockingLimits = exceededLimits.filter(
        ({ remediationRequired }) => !remediationRequired,
    );

    return {
        compatible: blockingLimits.length === 0,
        hasExceededLimits: exceededLimits.length > 0,
        blockingLimits,
        nonBlockingLimits,
    };
};

/**
 * Analyse l'utilisation réelle d'un Workspace face aux limites d'un Plan
 * catalogue cible, sans modifier le Plan ni UsageMetric.
 *
 * Le chargement et la validation du Plan restent ici car les workflows de
 * changement d'offre doivent vérifier qu'ils ciblent une offre active. Le
 * calcul de compatibilité est ensuite délégué à la primitive générique basée
 * sur les limites afin de ne pas dupliquer la logique de remédiation.
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

    const compatibility =
        await assessWorkspaceLimitsCompatibility({
            workspaceId,
            limits: targetPlan.limits,
            at,
            registry,
            session,
        });

    return {
        ...compatibility,
        targetPlan: {
            id: targetPlan._id.toString(),
            key: targetPlan.key,
            name: targetPlan.name,
        },
    };
};


export {
    assessWorkspaceLimitsCompatibility,
    assessWorkspacePlanCompatibility,
};