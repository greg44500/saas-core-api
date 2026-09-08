import { randomUUID } from 'node:crypto';

import {
    RETENTION_EXECUTION_TRIGGER,
} from '../../../../constants/retention.constants.js';
import {
    executeRetentionPolicy,
    previewRetentionPolicy,
} from '../../../retention/retentionEngine.service.js';
import {
    getCurrentRetentionPolicy,
} from '../../../retention/retentionPolicyRead.service.js';
import { AppError } from '../../../../utils/appError.js';
import {
    serializeExecution,
} from './platformRetentionRead.service.js';


const buildManualRetentionConfirmationPhrase = ({
    targetKey,
    policyVersion,
}) => `PURGE_${targetKey.toUpperCase()}_V${policyVersion}`;

const getCurrentPolicyOrThrow = async (targetKey) => {
    const policy = await getCurrentRetentionPolicy({ targetKey });

    if (!policy) {
        throw new AppError(
            'Aucune policy de rétention n’est configurée pour cette cible.',
            404,
        );
    }

    return policy;
};

const previewPlatformRetentionPolicy = async ({
    targetKey,
    now = new Date(),
}) => {
    const policy = await getCurrentPolicyOrThrow(targetKey);
    const preview = await previewRetentionPolicy({
        policy,
        now,
    });

    return {
        ...preview,
        confirmation: {
            phrase: buildManualRetentionConfirmationPhrase({
                targetKey,
                policyVersion: policy.version,
            }),
            expectedPolicyVersion: policy.version,
            expectedEligibleCount: preview.eligibleCount,
            expectedMaxAffectedThisRun:
                preview.maxAffectedThisRun,
        },
    };
};

/**
 * Exécution manuelle destructive à double garde : version exacte de policy et
 * impact exact issu d'une preview récente. Le cutoff reste toujours recalculé
 * côté serveur et n'est jamais accepté depuis la requête HTTP.
 */
const executePlatformRetentionPolicyManually = async ({
    targetKey,
    expectedPolicyVersion,
    expectedEligibleCount,
    expectedMaxAffectedThisRun,
    confirmation,
    actorId,
    now = new Date(),
}) => {
    if (!actorId) {
        throw new TypeError('actorId is required');
    }

    const policy = await getCurrentPolicyOrThrow(targetKey);

    if (policy.version !== expectedPolicyVersion) {
        throw new AppError(
            'La policy de rétention a changé. Relancez la prévisualisation avant toute purge.',
            409,
        );
    }

    const expectedConfirmation =
        buildManualRetentionConfirmationPhrase({
            targetKey,
            policyVersion: policy.version,
        });

    if (confirmation !== expectedConfirmation) {
        throw new AppError(
            'La confirmation explicite de purge est invalide.',
            400,
        );
    }

    if (
        policy.config?.enabled !== true
        || policy.config?.manualExecutionEnabled !== true
    ) {
        throw new AppError(
            'Cette policy n’autorise pas une exécution manuelle destructive.',
            409,
        );
    }

    const preview = await previewRetentionPolicy({
        policy,
        now,
    });

    if (
        preview.eligibleCount !== expectedEligibleCount
        || preview.maxAffectedThisRun !== expectedMaxAffectedThisRun
    ) {
        throw new AppError(
            'L’impact de la purge a changé. Relancez la prévisualisation avant de confirmer.',
            409,
        );
    }

    const result = await executeRetentionPolicy({
        policy,
        trigger: RETENTION_EXECUTION_TRIGGER.MANUAL,
        initiatedBy: actorId,
        holderId:
            `platform-api:${actorId.toString()}:${randomUUID()}`,
        now,
    });

    if (!result.executed) {
        throw new AppError(
            'Une exécution de rétention est déjà en cours pour cette cible.',
            409,
        );
    }

    return {
        preview,
        execution: serializeExecution(
            typeof result.execution.toObject === 'function'
                ? result.execution.toObject()
                : result.execution,
        ),
    };
};


export {
    buildManualRetentionConfirmationPhrase,
    executePlatformRetentionPolicyManually,
    previewPlatformRetentionPolicy,
};
