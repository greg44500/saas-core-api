import {
    ACTIVE_PLAN_CAPABILITY_REGISTRY,
} from '../../config/applicationCapability.registry.js';

import { AppError } from '../../utils/appError.js';

import {
    getWorkspacePlanEntitlement,
} from '../subscriptions/subscription.service.js';

import {
    reserveUsageMetricWithinLimit,
} from '../usageMetric/usageMetric.service.js';

import {
    PlanLimitExceededError,
} from './planLimitExceeded.error.js';

/**
 * Vérifie qu'une valeur représente un compteur de consommation valide.
 *
 * Les consommations et les limites sont exprimées avec des entiers positifs
 * ou nuls afin d'éviter les états impossibles ou ambigus.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
const isNonNegativeInteger = (value) =>
    Number.isInteger(value) && value >= 0;

/**
 * Résout la limite associée à une métrique dans un plan.
 *
 * La fonction distingue volontairement :
 * - une clé présente avec null : limite explicitement illimitée ;
 * - une clé absente : configuration de plan incomplète.
 *
 * Le registre est injectable afin que les applications métier puissent
 * déclarer leurs propres métriques sans modifier le socle SaaS.
 *
 * @param {object} params
 * @param {import('mongoose').Document | object} params.plan
 * @param {string} params.metricKey
 * @param {{
 *     metrics: Set<string>
 * }} [params.registry]
 * @returns {number | null}
 */
const resolvePlanMetricLimit = ({
    plan,
    metricKey,
    registry = ACTIVE_PLAN_CAPABILITY_REGISTRY,
}) => {
    if (!plan) {
        throw new TypeError(
            'plan is required to resolve a metric limit',
        );
    }

    if (
        typeof metricKey !== 'string'
        || metricKey.length === 0
    ) {
        throw new TypeError(
            'metricKey is required to resolve a metric limit',
        );
    }

    /*
     * Une métrique inconnue ne doit pas être interprétée comme une limite
     * absente : elle révèle que le module consommateur demande une capability
     * qui n'est pas déclarée dans l'application.
     */
    if (!registry.metrics.has(metricKey)) {
        throw new AppError(
            `Métrique de plan inconnue : ${metricKey}.`,
            400,
        );
    }

    const limits = plan.limits;

    /*
     * Les documents Mongoose exposent limits sous forme de Map. Une absence de
     * Map révèle ici un plan incomplet ou une donnée qui ne respecte pas le
     * contrat attendu par le moteur de quotas.
     */
    if (!(limits instanceof Map)) {
        throw new AppError(
            'Les limites du plan sont absentes ou invalides.',
            500,
        );
    }

    /*
     * has() est indispensable : get() retournerait undefined aussi bien pour
     * une clé absente que pour une éventuelle valeur indéfinie.
     */
    if (!limits.has(metricKey)) {
        throw new AppError(
            `La limite ${metricKey} n’est pas configurée dans le plan.`,
            500,
        );
    }

    return limits.get(metricKey);
};

/**
 * Évalue si une consommation supplémentaire respecte une limite de plan.
 *
 * Cette fonction reste pure :
 * - elle ne lit aucune donnée ;
 * - elle ne modifie aucun compteur ;
 * - elle ne dépend pas de Mongoose ;
 * - elle retourne uniquement une décision.
 *
 * Convention :
 * - null représente une limite illimitée ;
 * - 0 interdit toute consommation supplémentaire ;
 * - un entier positif représente le plafond autorisé.
 *
 * @param {object} params
 * @param {number | null} params.limit
 * @param {number} params.currentValue
 * @param {number} params.amount
 * @returns {{
 *     allowed: boolean,
 *     unlimited: boolean,
 *     limit: number | null,
 *     currentValue: number,
 *     requestedAmount: number,
 *     nextValue: number,
 *     remaining: number | null
 * }}
 */
const evaluatePlanLimit = ({
    limit,
    currentValue,
    amount,
}) => {
    if (
        limit !== null
        && !isNonNegativeInteger(limit)
    ) {
        throw new TypeError(
            'limit must be null or a non-negative integer',
        );
    }

    if (!isNonNegativeInteger(currentValue)) {
        throw new TypeError(
            'currentValue must be a non-negative integer',
        );
    }

    /*
     * Une réservation doit toujours représenter une consommation réelle.
     * Les diminutions et compensations seront traitées par des opérations
     * distinctes afin de ne pas contourner le contrôle des quotas.
     */
    if (!Number.isInteger(amount) || amount <= 0) {
        throw new TypeError(
            'amount must be a positive integer',
        );
    }

    const nextValue = currentValue + amount;

    if (limit === null) {
        return {
            allowed: true,
            unlimited: true,
            limit: null,
            currentValue,
            requestedAmount: amount,
            nextValue,
            remaining: null,
        };
    }

    const allowed = nextValue <= limit;

    return {
        allowed,
        unlimited: false,
        limit,
        currentValue,
        requestedAmount: amount,
        nextValue,
        remaining: allowed
            ? limit - nextValue
            : Math.max(limit - currentValue, 0),
    };
};
/**
 * Réserve une consommation depuis un entitlement déjà résolu.
 *
 * Cette variante ne relit pas Subscription. Elle est destinée aux opérations
 * qui ont déjà chargé la souscription et le plan dans une transaction MongoDB.
 *
 * Elle permet notamment au module File de :
 * - relire une seule fois l'entitlement dans la transaction ;
 * - revérifier la fonctionnalité file_upload ;
 * - réserver plusieurs métriques sur le même plan ;
 * - créer le document File dans le même snapshot transactionnel.
 *
 * @param {object} params
 * @param {string|import('mongoose').Types.ObjectId} params.workspaceId
 * @param {{
 *     subscription: import('mongoose').Document,
 *     plan: import('mongoose').Document
 * }} params.planEntitlement
 * @param {string} params.metricKey
 * @param {number} [params.amount]
 * @param {Date} [params.at]
 * @param {string|import('mongoose').Types.ObjectId|null} [params.actorId]
 * @param {object} [params.registry]
 * @param {import('mongoose').ClientSession|null} [params.session]
 * @returns {Promise<{
 *     subscription: import('mongoose').Document,
 *     plan: import('mongoose').Document,
 *     usageMetric: import('mongoose').Document,
 *     metricKey: string,
 *     limit: number | null
 * }>}
 */
const reservePlanLimitForEntitlement = async ({
    workspaceId,
    planEntitlement,
    metricKey,
    amount = 1,
    at = new Date(),
    actorId = null,
    registry = ACTIVE_PLAN_CAPABILITY_REGISTRY,
    session = null,
}) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to reserve a plan limit',
        );
    }

    if (
        !planEntitlement?.subscription
        || !planEntitlement?.plan
    ) {
        throw new TypeError(
            'A valid plan entitlement is required to reserve a plan limit',
        );
    }

    const {
        subscription,
        plan,
    } = planEntitlement;

    /*
     * La limite est toujours relue depuis le plan présent dans le snapshot
     * transactionnel. Une valeur précédemment mise en cache par un middleware
     * HTTP ne constitue pas une autorité pour cette écriture.
     */
    const limit = resolvePlanMetricLimit({
        plan,
        metricKey,
        registry,
    });

    const usageMetric =
        await reserveUsageMetricWithinLimit({
            workspaceId,
            metricKey,
            limit,
            amount,
            at,
            actorId,
            registry,
            session,
        });

    if (!usageMetric) {
        throw new PlanLimitExceededError(
            `La limite ${metricKey} du plan est atteinte.`,
            metricKey,
        );
    }

    return {
        subscription,
        plan,
        usageMetric,
        metricKey,
        limit,
    };
};
/**
 * Vérifie le droit d'un workspace et réserve atomiquement une consommation.
 *
 * Cette fonction orchestre les responsabilités spécialisées :
 * - Subscription résout le plan applicable au workspace ;
 * - Plan résout la limite correspondant à la métrique ;
 * - UsageMetric réserve la consommation sans dépasser cette limite.
 *
 * Le contrôle et l'incrément ne sont pas séparés. La décision finale repose
 * sur la réservation atomique effectuée directement dans MongoDB.
 *
 * @param {object} params
 * @param {string|import('mongoose').Types.ObjectId} params.workspaceId
 * @param {string} params.metricKey
 * @param {number} [params.amount]
 * @param {Date} [params.at]
 * @param {string|import('mongoose').Types.ObjectId|null} [params.actorId]
 * @param {{
 *     features: Set<string>,
 *     metrics: Set<string>,
 *     getMetricDefinition: (
 *         metricKey: string
 *     ) => { periodType: string } | null
 * }} [params.registry]
 * @param {import('mongoose').ClientSession|null} [params.session]
 * @returns {Promise<{
 *     subscription: import('mongoose').Document,
 *     plan: import('mongoose').Document,
 *     usageMetric: import('mongoose').Document,
 *     metricKey: string,
 *     limit: number | null
 * }>}
 */
const enforcePlanLimit = async ({
    workspaceId,
    metricKey,
    amount = 1,
    at = new Date(),
    actorId = null,
    registry = ACTIVE_PLAN_CAPABILITY_REGISTRY,
    session = null,
}) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to enforce a plan limit',
        );
    }

    /*
     * Cette entrée publique résout elle-même l'entitlement lorsqu'aucune
     * orchestration supérieure ne l'a encore chargé.
     */
    const planEntitlement =
        await getWorkspacePlanEntitlement({
            workspaceId,
            session,
        });

    return reservePlanLimitForEntitlement({
        workspaceId,
        planEntitlement,
        metricKey,
        amount,
        at,
        actorId,
        registry,
        session,
    });
};

export {
    enforcePlanLimit,
    evaluatePlanLimit,
    reservePlanLimitForEntitlement,
    resolvePlanMetricLimit,
};