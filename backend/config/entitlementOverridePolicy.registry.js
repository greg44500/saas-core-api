import {
    ACTIVE_PLAN_CAPABILITY_REGISTRY,
    APPLICATION_PLAN_CAPABILITY_MODULES,
} from './applicationCapability.registry.js';
import {
    CORE_PLAN_FEATURE,
    CORE_PLAN_METRIC,
} from '../modules/plan/planCapability.registry.js';


const MEBIBYTE = 1024 * 1024;
const GIBIBYTE = 1024 * MEBIBYTE;

const OVERRIDE_CONTROL = Object.freeze({
    LINEAR_SLIDER: 'linear_slider',
    PRESET_SLIDER: 'preset_slider',
});

/**
 * Les garde-fous d'administration sont distincts des limites commerciales des
 * Plans. Ils empêchent une erreur humaine de créer une dérogation aberrante,
 * sans modifier les valeurs normales définies dans le catalogue des Plans.
 */
const CORE_METRIC_OVERRIDE_POLICIES = Object.freeze({
    [CORE_PLAN_METRIC.MEMBERS]: Object.freeze({
        control: OVERRIDE_CONTROL.LINEAR_SLIDER,
        min: 0,
        max: 50,
        step: 1,
        allowUnlimited: false,
    }),
    [CORE_PLAN_METRIC.STORAGE_BYTES]: Object.freeze({
        control: OVERRIDE_CONTROL.PRESET_SLIDER,
        values: Object.freeze([
            0,
            100 * MEBIBYTE,
            500 * MEBIBYTE,
            GIBIBYTE,
            2 * GIBIBYTE,
            5 * GIBIBYTE,
            10 * GIBIBYTE,
        ]),
        allowUnlimited: false,
    }),
    [CORE_PLAN_METRIC.FILE_UPLOADS_MONTHLY]: Object.freeze({
        control: OVERRIDE_CONTROL.PRESET_SLIDER,
        values: Object.freeze([
            0,
            10,
            25,
            50,
            100,
            250,
            500,
        ]),
        allowUnlimited: false,
    }),
});

/**
 * Une feature peut dépendre d'un minimum de capacité pour être réellement
 * exploitable. Exemple : activer la gestion d'équipe avec `members = 1`
 * n'apporte aucune capacité de collaboration au workspace.
 */
const CORE_FEATURE_OVERRIDE_POLICIES = Object.freeze({
    [CORE_PLAN_FEATURE.TEAM_MANAGEMENT]: Object.freeze({
        requiredLimits: Object.freeze({
            [CORE_PLAN_METRIC.MEMBERS]: Object.freeze({
                minimumEffectiveValue: 2,
            }),
        }),
    }),
    [CORE_PLAN_FEATURE.FILE_UPLOAD]: Object.freeze({
        requiredLimits: Object.freeze({
            [CORE_PLAN_METRIC.STORAGE_BYTES]: Object.freeze({
                minimumEffectiveValue: 100 * MEBIBYTE,
            }),
            [CORE_PLAN_METRIC.FILE_UPLOADS_MONTHLY]: Object.freeze({
                minimumEffectiveValue: 1,
            }),
        }),
    }),
});

const isRecord = (value) =>
    value !== null
    && typeof value === 'object'
    && !Array.isArray(value);

const freezePolicyRecord = (record) => Object.freeze(
    Object.fromEntries(
        Object.entries(record).map(([key, value]) => [
            key,
            Object.freeze({
                ...value,
                ...(Array.isArray(value.values)
                    ? { values: Object.freeze([...value.values]) }
                    : {}),
                ...(isRecord(value.requiredLimits)
                    ? {
                        requiredLimits: Object.freeze(
                            Object.fromEntries(
                                Object.entries(value.requiredLimits).map(
                                    ([metricKey, policy]) => [
                                        metricKey,
                                        Object.freeze({ ...policy }),
                                    ],
                                ),
                            ),
                        ),
                    }
                    : {}),
            }),
        ]),
    ),
);

/**
 * Les applications dérivées peuvent déclarer leurs propres garde-fous dans le
 * même descriptor que leurs capabilities, sans ajouter de logique au frontend.
 */
const composeOverridePolicies = ({
    modules = APPLICATION_PLAN_CAPABILITY_MODULES,
    registry = ACTIVE_PLAN_CAPABILITY_REGISTRY,
} = {}) => {
    const metricPolicies = { ...CORE_METRIC_OVERRIDE_POLICIES };
    const featurePolicies = { ...CORE_FEATURE_OVERRIDE_POLICIES };

    modules.forEach((moduleDefinition, moduleIndex) => {
        if (!isRecord(moduleDefinition)) {
            throw new TypeError(
                `Capability module at index ${moduleIndex} must be an object`,
            );
        }

        const moduleMetricPolicies =
            moduleDefinition.metricOverridePolicies ?? {};
        const moduleFeaturePolicies =
            moduleDefinition.featureOverridePolicies ?? {};

        if (!isRecord(moduleMetricPolicies)) {
            throw new TypeError(
                `metricOverridePolicies at index ${moduleIndex} must be an object`,
            );
        }

        if (!isRecord(moduleFeaturePolicies)) {
            throw new TypeError(
                `featureOverridePolicies at index ${moduleIndex} must be an object`,
            );
        }

        for (const [metricKey, policy] of Object.entries(moduleMetricPolicies)) {
            if (!registry.metrics.has(metricKey)) {
                throw new TypeError(
                    `Override policy references an unknown metric: ${metricKey}`,
                );
            }

            if (Object.hasOwn(metricPolicies, metricKey)) {
                throw new TypeError(
                    `Duplicate metric override policy: ${metricKey}`,
                );
            }

            metricPolicies[metricKey] = policy;
        }

        for (const [featureKey, policy] of Object.entries(moduleFeaturePolicies)) {
            if (!registry.features.has(featureKey)) {
                throw new TypeError(
                    `Override policy references an unknown feature: ${featureKey}`,
                );
            }

            if (Object.hasOwn(featurePolicies, featureKey)) {
                throw new TypeError(
                    `Duplicate feature override policy: ${featureKey}`,
                );
            }

            featurePolicies[featureKey] = policy;
        }
    });

    return Object.freeze({
        metricPolicies: freezePolicyRecord(metricPolicies),
        featurePolicies: freezePolicyRecord(featurePolicies),
    });
};

const ACTIVE_ENTITLEMENT_OVERRIDE_POLICIES = composeOverridePolicies();

const getPlanMetricOverridePolicy = (
    metricKey,
    policies = ACTIVE_ENTITLEMENT_OVERRIDE_POLICIES.metricPolicies,
) => policies[metricKey] ?? null;

const getPlanFeatureOverridePolicy = (
    featureKey,
    policies = ACTIVE_ENTITLEMENT_OVERRIDE_POLICIES.featurePolicies,
) => policies[featureKey] ?? null;

const isLimitValueAllowedByOverridePolicy = ({ metricKey, limitValue }) => {
    const policy = getPlanMetricOverridePolicy(metricKey);
    if (!policy) return true;

    if (limitValue === null) {
        return policy.allowUnlimited === true;
    }

    if (!Number.isInteger(limitValue) || limitValue < 0) return false;

    if (policy.control === OVERRIDE_CONTROL.LINEAR_SLIDER) {
        if (limitValue < policy.min || limitValue > policy.max) return false;
        return (limitValue - policy.min) % policy.step === 0;
    }

    if (policy.control === OVERRIDE_CONTROL.PRESET_SLIDER) {
        return policy.values.includes(limitValue);
    }

    return false;
};


export {
    ACTIVE_ENTITLEMENT_OVERRIDE_POLICIES,
    CORE_FEATURE_OVERRIDE_POLICIES,
    CORE_METRIC_OVERRIDE_POLICIES,
    OVERRIDE_CONTROL,
    composeOverridePolicies,
    getPlanFeatureOverridePolicy,
    getPlanMetricOverridePolicy,
    isLimitValueAllowedByOverridePolicy,
};
