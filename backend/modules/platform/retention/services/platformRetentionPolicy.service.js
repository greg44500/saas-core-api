import {
    RETENTION_POLICY_SCHEMA_VERSION,
    validateRetentionPolicyConfig,
} from '../../../retention/retentionPolicy.validation.js';
import { RetentionPolicy } from '../../../retention/retentionPolicy.model.js';
import {
    getCurrentRetentionPolicy,
} from '../../../retention/retentionPolicyRead.service.js';
import { AppError } from '../../../../utils/appError.js';
import {
    serializePolicy,
} from './platformRetentionRead.service.js';


const buildRetentionPolicyConfig = ({
    targetKey,
    settings,
}) => ({
    schemaVersion: RETENTION_POLICY_SCHEMA_VERSION,
    targetKey,
    enabled: settings.enabled,
    retentionDays: settings.retentionDays,
    batchSize: settings.batchSize,
    maxBatchesPerRun: settings.maxBatchesPerRun,
    schedule: settings.schedule,
    manualExecutionEnabled: settings.manualExecutionEnabled,
});

/**
 * Crée une nouvelle version append-only avec contrôle optimiste explicite.
 * Un administrateur travaillant depuis une version obsolète doit relire la
 * configuration au lieu d'écraser silencieusement la décision d'un pair.
 */
const createPlatformRetentionPolicyVersion = async ({
    targetKey,
    expectedVersion,
    settings,
    actorId,
}) => {
    if (!actorId) {
        throw new TypeError('actorId is required');
    }

    const config = buildRetentionPolicyConfig({
        targetKey,
        settings,
    });
    const validation = validateRetentionPolicyConfig(config);

    if (!validation.success) {
        throw new AppError(
            validation.error.issues[0]?.message
                ?? 'Configuration de rétention invalide',
            400,
        );
    }

    const currentPolicy = await getCurrentRetentionPolicy({
        targetKey,
    });
    const currentVersion = currentPolicy?.version ?? null;

    if (currentVersion !== expectedVersion) {
        throw new AppError(
            'La policy de rétention a changé. Rechargez sa version courante avant de la modifier.',
            409,
        );
    }

    const nextVersion = currentVersion === null
        ? 1
        : currentVersion + 1;

    try {
        const policy = await RetentionPolicy.create({
            version: nextVersion,
            config: validation.data,
            createdBy: actorId,
        });

        return serializePolicy(
            typeof policy.toObject === 'function'
                ? policy.toObject()
                : policy,
        );
    } catch (error) {
        if (error?.code === 11000) {
            throw new AppError(
                'La policy de rétention a été modifiée simultanément. Rechargez sa version courante.',
                409,
            );
        }

        throw error;
    }
};


export {
    buildRetentionPolicyConfig,
    createPlatformRetentionPolicyVersion,
};
