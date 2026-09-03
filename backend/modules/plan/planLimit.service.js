import {
    ACTIVE_PLAN_CAPABILITY_REGISTRY,
} from '../../config/applicationCapability.registry.js';

import { AppError } from '../../utils/appError.js';

import {
    getWorkspaceEffectiveEntitlement,
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

const assertRegisteredMetric = ({
    metricKey,
    registry,
}) => {
    if (
        typeof metricKey !== 'string'
        || metricKey.length === 0
    ) {
        throw new TypeError(
            'metricKey is required to resolve a metric limit',
        );
    }

    if (
        !registry
        || !(registry.metrics instanceof Set)
    ) {
        throw new TypeError(
            'registry must provide a metric Set',
        );
    }

    /*
     * Une métrique inconnue ne doit pas être interprétée comme une limite
     * absente : elle révèle qu'un module consommateur demande une capability
     * qui n'est pas déclarée dans l'application réellement déployée.
     */
    if (!registry.metrics.has(metricKey)) {
        throw new AppError(
            `Métrique de plan inconnue : ${metricKey}.`,
            400,
        );
    }
};

/**
 * Résout la limite associée à une métrique dans un Plan catalogue.
 *
 * Cette primitive reste disponible pour les opérations qui analysent un Plan
 * en tant qu'offre. Les écritures runtime doivent utiliser
 * `resolveEffectiveMetricLimit()` afin de respecter les overrides actifs.
 *
 * @param {object} params
 * @param {import('mongoose').Document | object} params.plan
 * @param {string} params.metricKey
 * @param {{ metrics: Set<string> }} [params.registry]
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

    assertRegisteredMetric({
        metricKey,
        registry,
    });

    const limits = plan.limits;

    /*
     * Les documents Mongoose exposent limits sous forme de Map. Une absence de
     * Map révèle ici un Plan incomplet ou une donnée qui ne respecte pas le
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
 * Résout une limite depuis l'entitlement déjà composé du Workspace.
 *
 * Les limites effectives sont un DTO dérivé et non un document Mongoose. Une
 * valeur `null` conserve la convention Core « illimité ». Une clé absente est
 * une erreur de configuration : elle ne doit jamais devenir implicitement
 * illimitée, notamment lorsqu'une application clonée ajoute une métrique.
 *
 * @param {object} params
 * @param {{ effectiveCapabilities: { limits: object } }} params.entitlement
 * @param {string} params.metricKey
 * @param {{ metrics: Set<string> }} [params.registry]
 * @returns {number | null}
 */
const resolveEffectiveMetricLimit = ({
    entitlement,
    metricKey,
    registry = ACTIVE_PLAN_CAPABILITY_REGISTRY,
}) => {
    if (!entitlement?.effectiveCapabilities) {
        throw new TypeError(
            'effective entitlement is required to resolve a metric limit',
        );
    }

    assertRegisteredMetric({
        metricKey,
        registry,
    });

    const limits = entitlement.effectiveCapabilities.limits;

    if (
        !limits
        || typeof limits !== 'object'
        || Array.isArray(limits)
        || limits instanceof Map
    ) {
        throw new AppError(
            'Les limites effectives du workspace sont absentes ou invalides.',
            500,
        );
    }

    if (!Object.hasOwn(limits, metricKey)) {
        throw new AppError(
            `La limite effective ${metricKey} n’est pas configurée pour le workspace.`,
            500,
        );
    }

    const limit = limits[metricKey];

    if (
        limit !== null
        && !isNonNegativeInteger(limit)
    ) {
        throw new AppError(
            `La limite effective ${metricKey} est invalide.`,
            500,
        );
    }

    return limit;
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
     * Les diminutions et compensations sont traitées par des opérations
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
 * Réserve une consommation depuis un Plan entitlement déjà résolu.
 *
 * Cette primitive Plan-only est conservée pour les appels de catalogue ou les
 * tests historiques. Les écritures Workspace doivent désormais préférer
 * `reserveEffectiveLimitForEntitlement()` pour ne pas contourner un override.
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
 * Réserve une consommation depuis l'entitlement effectif d'un Workspace.
 *
 * La valeur utilisée par l'opération atomique vient uniquement de
 * `effectiveCapabilities.limits`. Un override d'augmentation, de réduction ou
 * d'illimité est donc appliqué à la même écriture qui incrémente UsageMetric ;
 * il n'existe pas de contrôle optimiste séparé susceptible d'être contourné.
 */
const reserveEffectiveLimitForEntitlement = async ({
    workspaceId,
    effectiveEntitlement,
    metricKey,
    amount = 1,
    at = new Date(),
    actorId = null,
    registry = ACTIVE_PLAN_CAPABILITY_REGISTRY,
    session = null,
}) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to reserve an effective limit',
        );
    }

    if (
        !effectiveEntitlement?.subscription
        || !effectiveEntitlement?.plan
        || !effectiveEntitlement?.effectiveCapabilities
    ) {
        throw new TypeError(
            'A valid effective entitlement is required to reserve a limit',
        );
    }

    const limit = resolveEffectiveMetricLimit({
        entitlement: effectiveEntitlement,
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
            `La limite ${metricKey} du workspace est atteinte.`,
            metricKey,
        );
    }

    return {
        subscription: effectiveEntitlement.subscription,
        plan: effectiveEntitlement.plan,
        effectiveCapabilities:
            effectiveEntitlement.effectiveCapabilities,
        usageMetric,
        metricKey,
        limit,
    };
};

/**
 * Résout l'entitlement effectif puis réserve atomiquement une consommation.
 *
 * L'instant `at` et le registre actif sont transmis à toute la chaîne afin que
 * Subscription, EntitlementOverride et UsageMetric prennent la même décision
 * commerciale, y compris au voisinage d'une échéance d'override ou de trial.
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

    const effectiveEntitlement =
        await getWorkspaceEffectiveEntitlement({
            workspaceId,
            at,
            registry,
            session,
        });

    return reserveEffectiveLimitForEntitlement({
        workspaceId,
        effectiveEntitlement,
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
    reserveEffectiveLimitForEntitlement,
    reservePlanLimitForEntitlement,
    resolveEffectiveMetricLimit,
    resolvePlanMetricLimit,
};