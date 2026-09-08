const RETENTION_TARGET_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

const RETENTION_ACTION = Object.freeze({
    DELETE: 'delete',
});

const RETENTION_CAPABILITY = Object.freeze({
    PREVIEW: 'preview',
    SCHEDULED_EXECUTION: 'scheduled_execution',
    MANUAL_EXECUTION: 'manual_execution',
});

const RETENTION_TARGET = Object.freeze({
    AUDIT_LOG: 'audit_log',
});

const RETENTION_ACTION_SET = new Set(
    Object.values(RETENTION_ACTION),
);
const RETENTION_CAPABILITY_SET = new Set(
    Object.values(RETENTION_CAPABILITY),
);

const RETENTION_TARGET_DEFINITION_KEYS = Object.freeze([
    'key',
    'label',
    'description',
    'action',
    'capabilities',
    'bounds',
]);

const RETENTION_BOUND_KEYS = Object.freeze([
    'retentionDays',
    'batchSize',
    'maxBatchesPerRun',
    'scheduleIntervalMinutes',
]);

const isRecord = (value) =>
    value !== null
    && typeof value === 'object'
    && !Array.isArray(value);

const normalizePositiveIntegerBound = ({
    targetKey,
    boundKey,
    bound,
}) => {
    if (!isRecord(bound)) {
        throw new TypeError(
            `Retention target "${targetKey}" requires bound "${boundKey}"`,
        );
    }

    const { min, max } = bound;

    if (
        !Number.isInteger(min)
        || min <= 0
        || !Number.isInteger(max)
        || max < min
    ) {
        throw new TypeError(
            `Retention target "${targetKey}" has invalid bound "${boundKey}"`,
        );
    }

    return Object.freeze({ min, max });
};

/**
 * Normalise une cible de rétention déclarée par le code.
 *
 * Une définition ne contient volontairement ni nom de collection MongoDB, ni
 * filtre libre, ni cutoff. Ces détails appartiendront à l'adapter technique
 * associé à la cible dans un lot ultérieur et ne seront jamais persistés dans
 * la configuration administrable.
 */
const normalizeRetentionTargetDefinition = (definition) => {
    if (!isRecord(definition)) {
        throw new TypeError(
            'Retention target definition must be an object',
        );
    }

    const unknownDefinitionKeys = Object.keys(definition).filter(
        (definitionKey) =>
            !RETENTION_TARGET_DEFINITION_KEYS.includes(definitionKey),
    );

    if (unknownDefinitionKeys.length > 0) {
        throw new TypeError(
            `Retention target definition has unknown fields: ${unknownDefinitionKeys.join(', ')}`,
        );
    }

    const {
        key,
        label,
        description,
        action,
        capabilities,
        bounds,
    } = definition;

    if (
        typeof key !== 'string'
        || !RETENTION_TARGET_KEY_PATTERN.test(key)
    ) {
        throw new TypeError('Invalid retention target key');
    }

    if (typeof label !== 'string' || label.trim().length === 0) {
        throw new TypeError(
            `Retention target "${key}" requires a label`,
        );
    }

    if (
        typeof description !== 'string'
        || description.trim().length === 0
    ) {
        throw new TypeError(
            `Retention target "${key}" requires a description`,
        );
    }

    if (!RETENTION_ACTION_SET.has(action)) {
        throw new TypeError(
            `Retention target "${key}" has an invalid action`,
        );
    }

    if (!Array.isArray(capabilities) || capabilities.length === 0) {
        throw new TypeError(
            `Retention target "${key}" requires capabilities`,
        );
    }

    const normalizedCapabilities = [...new Set(capabilities)];
    const unknownCapability = normalizedCapabilities.find(
        (capability) => !RETENTION_CAPABILITY_SET.has(capability),
    );

    if (unknownCapability) {
        throw new TypeError(
            `Retention target "${key}" has an invalid capability: ${unknownCapability}`,
        );
    }

    if (
        !normalizedCapabilities.includes(
            RETENTION_CAPABILITY.PREVIEW,
        )
    ) {
        throw new TypeError(
            `Retention target "${key}" must support preview`,
        );
    }

    if (!isRecord(bounds)) {
        throw new TypeError(
            `Retention target "${key}" requires bounds`,
        );
    }

    const normalizedBounds = Object.fromEntries(
        RETENTION_BOUND_KEYS.map((boundKey) => [
            boundKey,
            normalizePositiveIntegerBound({
                targetKey: key,
                boundKey,
                bound: bounds[boundKey],
            }),
        ]),
    );

    const unknownBoundKeys = Object.keys(bounds).filter(
        (boundKey) => !RETENTION_BOUND_KEYS.includes(boundKey),
    );

    if (unknownBoundKeys.length > 0) {
        throw new TypeError(
            `Retention target "${key}" has unknown bounds: ${unknownBoundKeys.join(', ')}`,
        );
    }

    return Object.freeze({
        key,
        label: label.trim(),
        description: description.trim(),
        action,
        capabilities: Object.freeze(normalizedCapabilities),
        bounds: Object.freeze(normalizedBounds),
    });
};

/**
 * Les bornes sont des garde-fous techniques, pas une politique juridique de
 * conservation. Aucune durée de rétention n'est choisie par défaut ici.
 */
const CORE_RETENTION_TARGET_DEFINITIONS = Object.freeze([
    normalizeRetentionTargetDefinition({
        key: RETENTION_TARGET.AUDIT_LOG,
        label: 'Journaux d’audit',
        description:
            'Applique une policy explicite aux journaux d’audit arrivés à échéance.',
        action: RETENTION_ACTION.DELETE,
        capabilities: [
            RETENTION_CAPABILITY.PREVIEW,
            RETENTION_CAPABILITY.SCHEDULED_EXECUTION,
            RETENTION_CAPABILITY.MANUAL_EXECUTION,
        ],
        bounds: {
            retentionDays: { min: 1, max: 36500 },
            batchSize: { min: 1, max: 500 },
            maxBatchesPerRun: { min: 1, max: 100 },
            scheduleIntervalMinutes: { min: 60, max: 525600 },
        },
    }),
]);

/**
 * Compose explicitement les cibles ajoutées par les modules d'un SaaS dérivé.
 * Aucun scan de fichiers ni variable d'environnement ne peut créer une cible.
 */
const composeRetentionTargetExtensions = (modules = []) => {
    if (!Array.isArray(modules)) {
        throw new TypeError(
            'Retention target modules must be an array',
        );
    }

    const targets = [];

    modules.forEach((moduleDefinition, moduleIndex) => {
        if (!isRecord(moduleDefinition)) {
            throw new TypeError(
                `Retention target module at index ${moduleIndex} must be an object`,
            );
        }

        const moduleTargets = moduleDefinition.targets ?? [];

        if (!Array.isArray(moduleTargets)) {
            throw new TypeError(
                `Retention target module at index ${moduleIndex} must expose a targets array`,
            );
        }

        targets.push(...moduleTargets);
    });

    return targets;
};

/**
 * Construit le registre code-owned actif des cibles de rétention.
 */
const createRetentionTargetRegistry = ({ targets = [] } = {}) => {
    if (!Array.isArray(targets)) {
        throw new TypeError('Retention targets must be an array');
    }

    const definitions = [...CORE_RETENTION_TARGET_DEFINITIONS];
    const knownKeys = new Set(
        definitions.map(({ key }) => key),
    );

    for (const target of targets) {
        const normalized = normalizeRetentionTargetDefinition(target);

        if (knownKeys.has(normalized.key)) {
            throw new TypeError(
                `Duplicate retention target: ${normalized.key}`,
            );
        }

        knownKeys.add(normalized.key);
        definitions.push(normalized);
    }

    const frozenDefinitions = Object.freeze(definitions);
    const definitionsByKey = new Map(
        frozenDefinitions.map((definition) => [
            definition.key,
            definition,
        ]),
    );

    return Object.freeze({
        definitions: frozenDefinitions,
        targetKeys: Object.freeze([...knownKeys]),

        hasTarget(targetKey) {
            return definitionsByKey.has(targetKey);
        },

        getTargetDefinition(targetKey) {
            return definitionsByKey.get(targetKey) ?? null;
        },
    });
};

const DEFAULT_RETENTION_TARGET_REGISTRY =
    createRetentionTargetRegistry();


export {
    CORE_RETENTION_TARGET_DEFINITIONS,
    DEFAULT_RETENTION_TARGET_REGISTRY,
    RETENTION_ACTION,
    RETENTION_CAPABILITY,
    RETENTION_TARGET,
    composeRetentionTargetExtensions,
    createRetentionTargetRegistry,
    normalizeRetentionTargetDefinition,
};
