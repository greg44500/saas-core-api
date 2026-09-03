import {
    USAGE_METRIC_BEHAVIOR,
    USAGE_METRIC_PERIOD_TYPE,
} from '../../constants/usageMetric.constants.js';


const CAPABILITY_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;
const CATEGORY_KEY_PATTERN = /^[a-z][a-z0-9_-]*$/;

const CORE_PLAN_FEATURE = Object.freeze({
    FILE_UPLOAD: 'file_upload',
    TEAM_MANAGEMENT: 'team_management',
    AUDIT_LOGS: 'audit_logs',
});

const CORE_PLAN_FEATURES = Object.freeze(
    Object.values(CORE_PLAN_FEATURE),
);

/**
 * Métadonnées de présentation des features Core.
 *
 * Elles n'accordent aucun droit : elles servent uniquement à construire une
 * administration Platform lisible et data-driven. La clé technique reste
 * l'autorité utilisée par Plan et les contrôles d'entitlement.
 */
const CORE_PLAN_FEATURE_DEFINITIONS = Object.freeze({
    [CORE_PLAN_FEATURE.FILE_UPLOAD]: Object.freeze({
        label: 'Téléversement de fichiers',
        description:
            'Permet de téléverser des fichiers dans le workspace.',
        category: 'files',
        categoryLabel: 'Fichiers',
        displayOrder: 10,
        tags: Object.freeze([]),
    }),

    [CORE_PLAN_FEATURE.TEAM_MANAGEMENT]: Object.freeze({
        label: 'Gestion d’équipe',
        description:
            'Permet d’administrer les membres et la collaboration du workspace.',
        category: 'workspace',
        categoryLabel: 'Collaboration',
        displayOrder: 20,
        tags: Object.freeze([]),
    }),

    [CORE_PLAN_FEATURE.AUDIT_LOGS]: Object.freeze({
        label: 'Historique d’activité',
        description:
            'Permet de consulter les journaux d’activité du workspace.',
        category: 'governance',
        categoryLabel: 'Gouvernance',
        displayOrder: 30,
        tags: Object.freeze([]),
    }),
});

const CORE_PLAN_METRIC = Object.freeze({
    MEMBERS: 'members',
    STORAGE_BYTES: 'storage_bytes',
    FILE_UPLOADS_MONTHLY: 'file_uploads_monthly',
});

const CORE_PLAN_METRIC_DEFINITIONS = Object.freeze({
    [CORE_PLAN_METRIC.MEMBERS]: Object.freeze({
        periodType: USAGE_METRIC_PERIOD_TYPE.CURRENT,
        behavior: USAGE_METRIC_BEHAVIOR.CAPACITY,
        remediationRequired: true,
    }),

    [CORE_PLAN_METRIC.STORAGE_BYTES]: Object.freeze({
        periodType: USAGE_METRIC_PERIOD_TYPE.CURRENT,
        behavior: USAGE_METRIC_BEHAVIOR.CAPACITY,
        remediationRequired: true,
    }),

    [CORE_PLAN_METRIC.FILE_UPLOADS_MONTHLY]: Object.freeze({
        periodType: USAGE_METRIC_PERIOD_TYPE.CALENDAR_MONTH,
        behavior: USAGE_METRIC_BEHAVIOR.CONSUMPTION,
        remediationRequired: false,
    }),
});

const CORE_PLAN_METRIC_PRESENTATIONS = Object.freeze({
    [CORE_PLAN_METRIC.MEMBERS]: Object.freeze({
        label: 'Membres',
        description: 'Nombre de membres autorisés dans le workspace.',
        category: 'workspace',
        categoryLabel: 'Collaboration',
        displayOrder: 10,
        unit: 'count',
    }),

    [CORE_PLAN_METRIC.STORAGE_BYTES]: Object.freeze({
        label: 'Stockage',
        description: 'Volume total de stockage autorisé.',
        category: 'files',
        categoryLabel: 'Fichiers',
        displayOrder: 20,
        unit: 'bytes',
    }),

    [CORE_PLAN_METRIC.FILE_UPLOADS_MONTHLY]: Object.freeze({
        label: 'Téléversements mensuels',
        description: 'Nombre de téléversements autorisés par mois.',
        category: 'files',
        categoryLabel: 'Fichiers',
        displayOrder: 30,
        unit: 'count',
    }),
});

const CORE_PLAN_METRICS = Object.freeze(
    Object.keys(CORE_PLAN_METRIC_DEFINITIONS),
);

const humanizeCapabilityKey = (key) => {
    const normalized = key.replaceAll('_', ' ');
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const assertCapabilityKey = (key, label) => {
    if (
        typeof key !== 'string'
        || !CAPABILITY_KEY_PATTERN.test(key)
    ) {
        throw new TypeError(`${label} contains an invalid capability key`);
    }
};

const normalizePresentation = (
    key,
    definition = {},
    fallbackCategory = 'other',
) => {
    const category = definition.category ?? fallbackCategory;

    if (
        typeof category !== 'string'
        || !CATEGORY_KEY_PATTERN.test(category)
    ) {
        throw new TypeError(
            `Capability "${key}" has an invalid category`,
        );
    }

    const label = definition.label ?? humanizeCapabilityKey(key);
    const categoryLabel =
        definition.categoryLabel ?? humanizeCapabilityKey(category);
    const description = definition.description ?? null;
    const displayOrder = definition.displayOrder ?? 1000;
    const tags = definition.tags ?? [];

    if (typeof label !== 'string' || label.trim().length === 0) {
        throw new TypeError(`Capability "${key}" requires a label`);
    }

    if (
        typeof categoryLabel !== 'string'
        || categoryLabel.trim().length === 0
    ) {
        throw new TypeError(
            `Capability "${key}" requires a categoryLabel`,
        );
    }

    if (
        description !== null
        && typeof description !== 'string'
    ) {
        throw new TypeError(
            `Capability "${key}" has an invalid description`,
        );
    }

    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
        throw new TypeError(
            `Capability "${key}" has an invalid displayOrder`,
        );
    }

    if (
        !Array.isArray(tags)
        || tags.some((tag) => typeof tag !== 'string')
    ) {
        throw new TypeError(`Capability "${key}" has invalid tags`);
    }

    return Object.freeze({
        key,
        label: label.trim(),
        description: description?.trim() || null,
        category,
        categoryLabel: categoryLabel.trim(),
        displayOrder,
        tags: Object.freeze([...tags]),
        ...(definition.unit
            ? { unit: definition.unit }
            : {}),
    });
};

const sortPresentations = (left, right) =>
    left.categoryLabel.localeCompare(right.categoryLabel, 'fr')
    || left.displayOrder - right.displayOrder
    || left.label.localeCompare(right.label, 'fr');

/**
 * Compose plusieurs déclarations de modules métier avant création du registre.
 *
 * Le Core n'effectue aucune découverte magique de fichiers. Une application
 * dérivée importe explicitement les descriptors des modules qu'elle embarque,
 * ce qui rend la composition lisible, testable et déterministe.
 */
const composePlanCapabilityExtensions = (modules = []) => {
    if (!Array.isArray(modules)) {
        throw new TypeError('modules must be an array');
    }

    const features = [];
    const metrics = [];
    const featureDefinitions = {};
    const metricDefinitions = {};
    const metricPresentations = {};

    const assignUnique = (target, entries, kind) => {
        for (const [key, value] of Object.entries(entries ?? {})) {
            if (Object.hasOwn(target, key)) {
                throw new TypeError(
                    `Duplicate ${kind} capability declaration: "${key}"`,
                );
            }

            target[key] = value;
        }
    };

    for (const moduleDefinition of modules) {
        if (!moduleDefinition || typeof moduleDefinition !== 'object') {
            throw new TypeError('Each capability module must be an object');
        }

        features.push(...(moduleDefinition.features ?? []));
        metrics.push(...(moduleDefinition.metrics ?? []));

        assignUnique(
            featureDefinitions,
            moduleDefinition.featureDefinitions,
            'feature',
        );
        assignUnique(
            metricDefinitions,
            moduleDefinition.metricDefinitions,
            'metric definition',
        );
        assignUnique(
            metricPresentations,
            moduleDefinition.metricPresentations,
            'metric presentation',
        );
    }

    return {
        features,
        metrics,
        featureDefinitions,
        metricDefinitions,
        metricPresentations,
    };
};

/**
 * Construit le registre de capabilities d'une application.
 *
 * Les Set `features` et `metrics` restent présents pour préserver le contrat
 * des services existants. Les nouvelles méthodes de catalogue fournissent les
 * métadonnées nécessaires à une administration Platform entièrement dynamique.
 */
const createPlanCapabilityRegistry = ({
    features = [],
    metrics = [],
    featureDefinitions = {},
    metricDefinitions = {},
    metricPresentations = {},
} = {}) => {
    for (const feature of features) {
        assertCapabilityKey(feature, 'features');
    }

    for (const metric of metrics) {
        assertCapabilityKey(metric, 'metrics');
    }

    for (const key of Object.keys(featureDefinitions)) {
        assertCapabilityKey(key, 'featureDefinitions');
    }

    for (const key of Object.keys(metricDefinitions)) {
        assertCapabilityKey(key, 'metricDefinitions');
    }

    for (const key of Object.keys(metricPresentations)) {
        assertCapabilityKey(key, 'metricPresentations');
    }

    const extensionMetricDefinitions = Object.entries(
        metricDefinitions,
    ).map(([metricKey, definition]) => [
        metricKey,
        Object.freeze({ ...definition }),
    ]);

    const metricDefinitionRegistry = new Map([
        ...Object.entries(CORE_PLAN_METRIC_DEFINITIONS),
        ...extensionMetricDefinitions,
    ]);

    const featureRegistry = new Set([
        ...CORE_PLAN_FEATURES,
        ...features,
        ...Object.keys(featureDefinitions),
    ]);

    const metricRegistry = new Set([
        ...CORE_PLAN_METRICS,
        ...metrics,
        ...Object.keys(metricDefinitions),
        ...Object.keys(metricPresentations),
    ]);

    const featureDefinitionRegistry = new Map();
    for (const featureKey of featureRegistry) {
        featureDefinitionRegistry.set(
            featureKey,
            normalizePresentation(
                featureKey,
                featureDefinitions[featureKey]
                    ?? CORE_PLAN_FEATURE_DEFINITIONS[featureKey]
                    ?? {},
            ),
        );
    }

    const metricPresentationRegistry = new Map();
    for (const metricKey of metricRegistry) {
        metricPresentationRegistry.set(
            metricKey,
            normalizePresentation(
                metricKey,
                metricPresentations[metricKey]
                    ?? CORE_PLAN_METRIC_PRESENTATIONS[metricKey]
                    ?? {},
            ),
        );
    }

    return Object.freeze({
        features: featureRegistry,
        metrics: metricRegistry,

        getFeatureDefinition(featureKey) {
            return featureDefinitionRegistry.get(featureKey) ?? null;
        },

        listFeatureDefinitions() {
            return [...featureDefinitionRegistry.values()]
                .sort(sortPresentations);
        },

        getMetricDefinition(metricKey) {
            return metricDefinitionRegistry.get(metricKey) ?? null;
        },

        getMetricPresentation(metricKey) {
            return metricPresentationRegistry.get(metricKey) ?? null;
        },

        listMetricPresentations() {
            return [...metricPresentationRegistry.values()]
                .sort(sortPresentations);
        },
    });
};

const DEFAULT_PLAN_CAPABILITY_REGISTRY =
    createPlanCapabilityRegistry();


export {
    CORE_PLAN_FEATURE,
    CORE_PLAN_FEATURE_DEFINITIONS,
    CORE_PLAN_FEATURES,
    CORE_PLAN_METRIC_DEFINITIONS,
    CORE_PLAN_METRIC_PRESENTATIONS,
    CORE_PLAN_METRICS,
    CORE_PLAN_METRIC,
    DEFAULT_PLAN_CAPABILITY_REGISTRY,
    composePlanCapabilityExtensions,
    createPlanCapabilityRegistry,
};
