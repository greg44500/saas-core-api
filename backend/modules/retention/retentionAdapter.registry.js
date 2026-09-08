import {
    auditLogRetentionAdapter,
} from './adapters/auditLogRetention.adapter.js';
import {
    RETENTION_CAPABILITY,
} from './retentionTarget.registry.js';

const RETENTION_ADAPTER_KEYS = Object.freeze([
    'targetKey',
    'preview',
    'executeBatch',
]);

const isRecord = (value) =>
    value !== null
    && typeof value === 'object'
    && !Array.isArray(value);

const CORE_RETENTION_ADAPTERS = Object.freeze([
    auditLogRetentionAdapter,
]);

/**
 * Valide et fige un adapter de rétention avant son enregistrement.
 *
 * Le contrat d'extension est volontairement étroit : un adapter peut exposer
 * uniquement sa cible, une prévisualisation et, si la cible l'autorise, une
 * exécution par batch. Il ne doit jamais devenir une abstraction générique
 * permettant de transmettre depuis l'extérieur une collection MongoDB, un
 * filtre, une projection ou une opération arbitraire.
 *
 * Le registre de targets reste l'autorité sur les capabilities autorisées.
 * Un adapter ne peut donc pas s'octroyer une capacité d'exécution absente de la
 * définition de sa cible.
 */
const normalizeRetentionAdapter = ({ adapter, targetRegistry }) => {
    if (!isRecord(adapter)) {
        throw new TypeError('Retention adapter must be an object');
    }

    const unknownKeys = Object.keys(adapter).filter(
        (key) => !RETENTION_ADAPTER_KEYS.includes(key),
    );

    if (unknownKeys.length > 0) {
        throw new TypeError(
            `Retention adapter has unknown fields: ${unknownKeys.join(', ')}`,
        );
    }

    const target = targetRegistry.getTargetDefinition(
        adapter.targetKey,
    );

    if (!target) {
        throw new TypeError(
            `Retention adapter targets an unknown target: ${adapter.targetKey}`,
        );
    }

    if (typeof adapter.preview !== 'function') {
        throw new TypeError(
            `Retention adapter "${adapter.targetKey}" requires preview()`,
        );
    }

    const canExecute = target.capabilities.some((capability) => [
        RETENTION_CAPABILITY.SCHEDULED_EXECUTION,
        RETENTION_CAPABILITY.MANUAL_EXECUTION,
    ].includes(capability));

    if (canExecute && typeof adapter.executeBatch !== 'function') {
        throw new TypeError(
            `Retention adapter "${adapter.targetKey}" requires executeBatch()`,
        );
    }

    return Object.freeze({
        targetKey: adapter.targetKey,
        preview: adapter.preview,
        executeBatch: adapter.executeBatch,
    });
};

/**
 * Extrait les adapters déclarés par les modules applicatifs ajoutés après
 * clonage du Core.
 *
 * La composition ne valide pas encore les droits de la cible : cette étape est
 * centralisée dans createRetentionAdapterRegistry afin que les adapters Core et
 * métier passent exactement par la même frontière de validation.
 */
const composeRetentionAdapterExtensions = (modules = []) => {
    if (!Array.isArray(modules)) {
        throw new TypeError('Retention adapter modules must be an array');
    }

    const adapters = [];

    modules.forEach((moduleDefinition, moduleIndex) => {
        if (!isRecord(moduleDefinition)) {
            throw new TypeError(
                `Retention adapter module at index ${moduleIndex} must be an object`,
            );
        }

        const moduleAdapters = moduleDefinition.adapters ?? [];

        if (!Array.isArray(moduleAdapters)) {
            throw new TypeError(
                `Retention adapter module at index ${moduleIndex} must expose an adapters array`,
            );
        }

        adapters.push(...moduleAdapters);
    });

    return adapters;
};

/**
 * Construit le registre immuable des adapters de rétention disponibles.
 *
 * Chaque target ne peut posséder qu'un seul adapter effectif. Cette unicité
 * évite qu'un même domaine soit purgé par deux implémentations concurrentes ou
 * ambiguës. Les extensions métier utilisent le même contrat que les adapters
 * Core et ne peuvent élargir les responsabilités du moteur de rétention.
 */
const createRetentionAdapterRegistry = ({
    targetRegistry,
    adapters = [],
} = {}) => {
    if (
        !targetRegistry
        || typeof targetRegistry.getTargetDefinition !== 'function'
    ) {
        throw new TypeError(
            'A retention target registry is required to build adapters',
        );
    }

    if (!Array.isArray(adapters)) {
        throw new TypeError('Retention adapters must be an array');
    }

    const normalizedAdapters = [
        ...CORE_RETENTION_ADAPTERS,
        ...adapters,
    ].map((adapter) => normalizeRetentionAdapter({
        adapter,
        targetRegistry,
    }));

    const byTarget = new Map();

    for (const adapter of normalizedAdapters) {
        if (byTarget.has(adapter.targetKey)) {
            throw new TypeError(
                `Duplicate retention adapter: ${adapter.targetKey}`,
            );
        }

        byTarget.set(adapter.targetKey, adapter);
    }

    return Object.freeze({
        definitions: Object.freeze(normalizedAdapters),

        getAdapter(targetKey) {
            return byTarget.get(targetKey) ?? null;
        },
    });
};

export {
    CORE_RETENTION_ADAPTERS,
    composeRetentionAdapterExtensions,
    createRetentionAdapterRegistry,
};
