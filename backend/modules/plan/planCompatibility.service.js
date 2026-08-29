import { PLAN_STATUS } from '../../constants/plan.constants.js';
import {
    USAGE_METRIC_BEHAVIOR,
} from '../../constants/usageMetric.constants.js';
import { AppError } from '../../utils/appError.js';
import {
    getUsageMetricValue,
} from '../usageMetric/usageMetric.service.js';
import { Plan } from './plan.model.js';
import {
    DEFAULT_PLAN_CAPABILITY_REGISTRY,
} from './planCapability.registry.js';


const isValidDate = (value) =>
    value instanceof Date
    && !Number.isNaN(value.getTime());

/**
 * Normalise la Map Mongoose ou l'objet lean représentant les limites d'un
 * plan. Le service reste ainsi indépendant de la représentation retournée par
 * Mongoose tout en conservant Plan comme source de vérité commerciale.
 *
 * @param {Map<string, number|null>|Record<string, number|null>} limits
 * @returns {Array<[string, number|null]>}
 */
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

/**
 * Vérifie qu'une définition de métrique possède la sémantique minimale
 * nécessaire à une décision de compatibilité de plan.
 *
 * Une métrique mesurable mais dépourvue de nature métier ne doit pas être
 * interprétée arbitrairement comme bloquante ou non bloquante.
 *
 * @param {string} metricKey
 * @param {object|null} definition
 * @returns {void}
 */
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
 * Les dépassements de capacité réductibles sont classés comme bloquants car
 * ils devront placer le workspace en mode de remédiation lorsque le plan
 * deviendra effectif. Les compteurs de consommation déjà réalisés restent
 * visibles mais ne peuvent pas imposer une remédiation impossible à effectuer.
 *
 * `compatible` signifie donc "aucune remédiation obligatoire" et non
 * "aucune métrique dépassée".
 *
 * @param {object} params
 * @param {string|import('mongoose').Types.ObjectId} params.workspaceId
 * @param {string|import('mongoose').Types.ObjectId} params.targetPlanId
 * @param {Date} [params.at]
 * @param {{
 *     getMetricDefinition: (metricKey: string) => object|null
 * }} [params.registry]
 * @param {import('mongoose').ClientSession|null} [params.session]
 * @returns {Promise<{
 *     compatible: boolean,
 *     hasExceededLimits: boolean,
 *     targetPlan: { id: string, key: string, name: string },
 *     blockingLimits: object[],
 *     nonBlockingLimits: object[]
 * }>}
 */
const assessWorkspacePlanCompatibility = async ({
    workspaceId,
    targetPlanId,
    at = new Date(),
    registry = DEFAULT_PLAN_CAPABILITY_REGISTRY,
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