import {
    ACTIVE_RETENTION_TARGET_REGISTRY,
} from '../../config/applicationRetention.registry.js';
import { RetentionPolicy } from './retentionPolicy.model.js';

const assertKnownTarget = (targetKey) => {
    if (!ACTIVE_RETENTION_TARGET_REGISTRY.hasTarget(targetKey)) {
        throw new TypeError(`Unknown retention target: ${targetKey}`);
    }
};

/**
 * Lit la version courante sans inventer d'état mutable parallèle.
 * La policy append-only ayant la version la plus élevée est l'autorité runtime.
 */
const getCurrentRetentionPolicy = async ({ targetKey }) => {
    assertKnownTarget(targetKey);

    return RetentionPolicy.findOne({
        'config.targetKey': targetKey,
    })
        .sort({ version: -1 })
        .lean();
};

export { getCurrentRetentionPolicy };
