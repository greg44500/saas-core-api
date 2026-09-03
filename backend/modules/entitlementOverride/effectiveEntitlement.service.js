import {
    ACTIVE_PLAN_CAPABILITY_REGISTRY,
} from '../../config/applicationCapability.registry.js';


const isNonNegativeInteger = (value) =>
    Number.isInteger(value) && value >= 0;

const assertRegistryContract = (registry) => {
    if (
        !registry
        || !(registry.features instanceof Set)
        || !(registry.metrics instanceof Set)
    ) {
        throw new TypeError(
            'registry must expose features and metrics sets',
        );
    }
};

const toPlanLimitEntries = (limits) => {
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

    if (limits == null) {
        return [];
    }

    throw new TypeError(
        'plan limits must be a Map or a plain object',
    );
};

const assertRegisteredPlanCapabilities = ({
    plan,
    registry,
}) => {
    for (const featureKey of plan.features ?? []) {
        if (!registry.features.has(featureKey)) {
            throw new TypeError(
                `Unknown plan feature in effective entitlement: "${featureKey}"`,
            );
        }
    }

    for (const [metricKey, limitValue] of toPlanLimitEntries(plan.limits)) {
        if (!registry.metrics.has(metricKey)) {
            throw new TypeError(
                `Unknown plan metric in effective entitlement: "${metricKey}"`,
            );
        }

        if (
            limitValue !== null
            && !isNonNegativeInteger(limitValue)
        ) {
            throw new TypeError(
                `Invalid plan limit in effective entitlement: "${metricKey}"`,
            );
        }
    }
};

const assertOverrideCapabilities = ({
    activeOverrides,
    registry,
}) => {
    if (
        !activeOverrides
        || typeof activeOverrides !== 'object'
        || Array.isArray(activeOverrides)
    ) {
        throw new TypeError(
            'activeOverrides must be an entitlement override resolution',
        );
    }

    if (
        !activeOverrides.features
        || typeof activeOverrides.features !== 'object'
        || Array.isArray(activeOverrides.features)
        || !activeOverrides.limits
        || typeof activeOverrides.limits !== 'object'
        || Array.isArray(activeOverrides.limits)
        || !Array.isArray(activeOverrides.overrides)
    ) {
        throw new TypeError(
            'activeOverrides has an invalid resolution shape',
        );
    }

    for (const [featureKey, enabled] of Object.entries(
        activeOverrides.features,
    )) {
        if (!registry.features.has(featureKey)) {
            throw new TypeError(
                `Unknown override feature in effective entitlement: "${featureKey}"`,
            );
        }

        if (typeof enabled !== 'boolean') {
            throw new TypeError(
                `Invalid override feature state in effective entitlement: "${featureKey}"`,
            );
        }
    }

    for (const [metricKey, limitValue] of Object.entries(
        activeOverrides.limits,
    )) {
        if (!registry.metrics.has(metricKey)) {
            throw new TypeError(
                `Unknown override metric in effective entitlement: "${metricKey}"`,
            );
        }

        if (
            limitValue !== null
            && !isNonNegativeInteger(limitValue)
        ) {
            throw new TypeError(
                `Invalid override limit in effective entitlement: "${metricKey}"`,
            );
        }
    }
};

/**
 * Compose les capabilities réellement applicables à partir d'un Plan catalogue
 * et des EntitlementOverride déjà résolus comme actifs.
 *
 * Cette fonction est volontairement pure : elle clone les features et limites
 * avant d'appliquer les exceptions. Modifier l'entitlement d'un Workspace ne
 * doit jamais muter le Plan partagé par d'autres clients ni la Subscription qui
 * référence ce Plan.
 *
 * Sémantique de l'overlay :
 * - feature `true`  -> active la capability, même si le Plan ne l'inclut pas ;
 * - feature `false` -> retire la capability, même si le Plan l'inclut ;
 * - limite          -> remplace exactement la valeur catalogue ;
 * - limite `null`   -> conserve la convention Core « illimité ».
 *
 * Le registre applicatif reste l'autorité. Une ancienne donnée persistée qui
 * référence une capability retirée du logiciel provoque une erreur plutôt que
 * d'accorder silencieusement un droit que le code courant ne sait plus gérer.
 *
 * @param {object} params
 * @param {{
 *     features?: string[],
 *     limits?: Map<string, number|null>|Record<string, number|null>
 * }} params.plan Plan catalogue déjà résolu par Subscription.
 * @param {{
 *     features: Record<string, boolean>,
 *     limits: Record<string, number|null>,
 *     overrides: object[]
 * }} params.activeOverrides Résultat de resolveActiveEntitlementOverrides().
 * @param {{features: Set<string>, metrics: Set<string>}} [params.registry]
 * @returns {{
 *     features: string[],
 *     limits: Record<string, number|null>,
 *     appliedOverrides: object[]
 * }} Vue dérivée destinée aux moteurs d'accès et de quotas.
 */
const composeEffectiveEntitlementCapabilities = ({
    plan,
    activeOverrides,
    registry = ACTIVE_PLAN_CAPABILITY_REGISTRY,
}) => {
    if (!plan) {
        throw new TypeError(
            'plan is required to compose effective entitlement capabilities',
        );
    }

    if (
        plan.features != null
        && !Array.isArray(plan.features)
    ) {
        throw new TypeError('plan features must be an array');
    }

    assertRegistryContract(registry);
    assertRegisteredPlanCapabilities({
        plan,
        registry,
    });
    assertOverrideCapabilities({
        activeOverrides,
        registry,
    });

    const effectiveFeatures = new Set(plan.features ?? []);

    for (const [featureKey, enabled] of Object.entries(
        activeOverrides.features,
    )) {
        if (enabled) {
            effectiveFeatures.add(featureKey);
        } else {
            effectiveFeatures.delete(featureKey);
        }
    }

    const effectiveLimits = new Map(
        toPlanLimitEntries(plan.limits),
    );

    for (const [metricKey, limitValue] of Object.entries(
        activeOverrides.limits,
    )) {
        effectiveLimits.set(metricKey, limitValue);
    }

    /*
     * Features et limites sont des ensembles sémantiques : un ordre stable
     * évite que l'ordre d'insertion d'un Plan ou d'un override fasse varier les
     * DTO internes, les logs de diagnostic ou les tests sans raison métier.
     */
    const features = [...effectiveFeatures]
        .sort((left, right) => left.localeCompare(right));

    const limits = Object.fromEntries(
        [...effectiveLimits.entries()]
            .sort(([left], [right]) => left.localeCompare(right)),
    );

    return {
        features,
        limits,
        appliedOverrides: activeOverrides.overrides.map(
            (override) => ({ ...override }),
        ),
    };
};


export {
    composeEffectiveEntitlementCapabilities,
};
