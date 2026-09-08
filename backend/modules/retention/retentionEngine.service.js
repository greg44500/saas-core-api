import {
    ACTIVE_RETENTION_ADAPTER_REGISTRY,
} from '../../config/applicationRetention.registry.js';
import {
    RETENTION_EXECUTION_ERROR_CODE,
    RETENTION_EXECUTION_STATUS,
    RETENTION_EXECUTION_TRIGGER,
} from '../../constants/retention.constants.js';
import { RetentionExecution } from './retentionExecution.model.js';
import {
    acquireRetentionLock,
    releaseRetentionLock,
    renewRetentionLock,
} from './retentionLock.service.js';
import {
    validateRetentionPolicyConfig,
} from './retentionPolicy.validation.js';

const RETENTION_EXECUTION_TRIGGER_SET = new Set(
    Object.values(RETENTION_EXECUTION_TRIGGER),
);

class RetentionLockLostError extends Error {
    constructor() {
        super('Retention lock ownership was lost');
        this.name = 'RetentionLockLostError';
        this.code = RETENTION_EXECUTION_ERROR_CODE.LOCK_LOST;
    }
}

const assertValidDate = (value, name) => {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
        throw new TypeError(`${name} must be a valid Date`);
    }
};

const getClockDate = (clock) => {
    if (typeof clock !== 'function') {
        throw new TypeError('clock must be a function');
    }

    const value = clock();
    assertValidDate(value, 'clock() result');
    return value;
};

const normalizeRetentionPolicy = (policy) => {
    if (!policy || !policy._id) {
        throw new TypeError('A persisted retention policy is required');
    }

    if (!Number.isSafeInteger(policy.version) || policy.version <= 0) {
        throw new TypeError('Retention policy version must be positive');
    }

    const rawConfig = typeof policy.config?.toObject === 'function'
        ? policy.config.toObject({
            depopulate: true,
            getters: false,
            virtuals: false,
        })
        : policy.config;

    const validation = validateRetentionPolicyConfig(rawConfig);

    if (!validation.success) {
        throw new TypeError(
            'Persisted retention policy configuration is invalid',
        );
    }

    return {
        _id: policy._id,
        version: policy.version,
        config: validation.data,
    };
};

const calculateRetentionCutoff = ({ now, retentionDays }) => {
    assertValidDate(now, 'now');

    if (!Number.isSafeInteger(retentionDays) || retentionDays <= 0) {
        throw new TypeError('retentionDays must be a positive safe integer');
    }

    const cutoffAt = new Date(now);
    cutoffAt.setUTCDate(
        cutoffAt.getUTCDate() - retentionDays,
    );
    return cutoffAt;
};

const getAdapter = (targetKey) => {
    const adapter = ACTIVE_RETENTION_ADAPTER_REGISTRY.getAdapter(
        targetKey,
    );

    if (!adapter) {
        throw new Error(
            `No code-owned retention adapter for target: ${targetKey}`,
        );
    }

    return adapter;
};

const previewRetentionPolicy = async ({
    policy,
    now = new Date(),
}) => {
    assertValidDate(now, 'now');

    const normalizedPolicy = normalizeRetentionPolicy(policy);
    const { config } = normalizedPolicy;
    const adapter = getAdapter(config.targetKey);
    const cutoffAt = calculateRetentionCutoff({
        now,
        retentionDays: config.retentionDays,
    });

    const preview = await adapter.preview({ cutoffAt });
    const eligibleCount = preview?.eligibleCount;

    if (!Number.isSafeInteger(eligibleCount) || eligibleCount < 0) {
        throw new Error(
            'Retention adapter returned an invalid preview count',
        );
    }

    const maxAffectedThisRun = Math.min(
        eligibleCount,
        config.batchSize * config.maxBatchesPerRun,
    );
    const estimatedBatches = eligibleCount === 0
        ? 0
        : Math.min(
            Math.ceil(eligibleCount / config.batchSize),
            config.maxBatchesPerRun,
        );

    return {
        policyId: normalizedPolicy._id,
        policyVersion: normalizedPolicy.version,
        targetKey: config.targetKey,
        cutoffAt,
        eligibleCount,
        batchSize: config.batchSize,
        maxBatchesPerRun: config.maxBatchesPerRun,
        estimatedBatches,
        maxAffectedThisRun,
        truncated:
            eligibleCount > maxAffectedThisRun,
    };
};

const validateBatchResult = (result) => {
    const keys = [
        'selected',
        'processed',
        'affected',
        'skipped',
        'failed',
    ];

    if (!result || typeof result !== 'object') {
        throw new Error('Retention adapter returned an invalid batch result');
    }

    for (const key of keys) {
        if (!Number.isSafeInteger(result[key]) || result[key] < 0) {
            throw new Error(
                'Retention adapter returned invalid batch counters',
            );
        }
    }

    const classified =
        result.affected + result.skipped + result.failed;

    if (
        result.processed !== result.selected
        || classified !== result.processed
    ) {
        throw new Error(
            'Retention adapter returned inconsistent batch counters',
        );
    }

    return result;
};

const toExecutionLease = (lease) => ({
    leaseId: lease.leaseId,
    holderId: lease.holderId,
    acquiredAt: lease.acquiredAt,
    expiresAt: lease.expiresAt,
});

const getFailureCode = (error) =>
    error?.code === RETENTION_EXECUTION_ERROR_CODE.LOCK_LOST
        ? RETENTION_EXECUTION_ERROR_CODE.LOCK_LOST
        : RETENTION_EXECUTION_ERROR_CODE.TARGET_EXECUTION_FAILED;

/**
 * Lorsqu'une nouvelle lease est acquise, toute ancienne exécution RUNNING de la
 * même target est nécessairement orpheline du lock. Elle est fermée durablement
 * avant de démarrer un nouveau run afin qu'un crash ne laisse pas une trace
 * indéfiniment ambiguë.
 */
const markInterruptedRetentionExecutions = async ({
    targetKey,
    now = new Date(),
}) => {
    assertValidDate(now, 'now');

    const executions = await RetentionExecution.find({
        'policySnapshot.targetKey': targetKey,
        status: RETENTION_EXECUTION_STATUS.RUNNING,
    }).sort({ startedAt: 1 });

    let interrupted = 0;

    for (const execution of executions) {
        execution.status = RETENTION_EXECUTION_STATUS.FAILED;
        execution.finishedAt =
            execution.startedAt instanceof Date
            && execution.startedAt > now
                ? execution.startedAt
                : now;
        execution.errorCode =
            RETENTION_EXECUTION_ERROR_CODE.INTERRUPTED;

        await execution.save();
        interrupted += 1;
    }

    return interrupted;
};

/**
 * Exécute une policy avec une lease déjà acquise.
 *
 * Cette primitive est partagée par le scheduler et la future API manuelle. La
 * lease est renouvelée avant et après chaque lot ; une perte d'autorité stoppe
 * le worker avant le lot suivant et l'exécution est tracée en échec.
 */
const executeRetentionPolicyWithLease = async ({
    policy,
    lease,
    trigger,
    initiatedBy = null,
    now = new Date(),
    clock = () => new Date(),
}) => {
    assertValidDate(now, 'now');

    if (!RETENTION_EXECUTION_TRIGGER_SET.has(trigger)) {
        throw new TypeError('Invalid retention execution trigger');
    }

    const normalizedPolicy = normalizeRetentionPolicy(policy);
    const { config } = normalizedPolicy;

    if (config.enabled !== true) {
        throw new Error('Disabled retention policy cannot be executed');
    }

    if (
        trigger === RETENTION_EXECUTION_TRIGGER.MANUAL
        && (!initiatedBy || config.manualExecutionEnabled !== true)
    ) {
        throw new Error('Manual retention execution is not allowed');
    }

    if (
        trigger === RETENTION_EXECUTION_TRIGGER.SCHEDULED
        && (initiatedBy !== null || config.schedule === null)
    ) {
        throw new Error('Scheduled retention execution is not allowed');
    }

    if (!lease || lease.targetKey !== config.targetKey) {
        throw new TypeError(
            'A lease for the retention policy target is required',
        );
    }

    const adapter = getAdapter(config.targetKey);
    const cutoffAt = calculateRetentionCutoff({
        now,
        retentionDays: config.retentionDays,
    });

    const execution = new RetentionExecution({
        policy: normalizedPolicy._id,
        policyVersion: normalizedPolicy.version,
        policySnapshot: config,
        trigger,
        initiatedBy,
        startedAt: now,
        cutoffAt,
        lease: toExecutionLease(lease),
    });

    await execution.save();

    let currentLease = lease;

    try {
        for (
            let batchIndex = 0;
            batchIndex < config.maxBatchesPerRun;
            batchIndex += 1
        ) {
            currentLease = await renewRetentionLock({
                lease: currentLease,
                now: getClockDate(clock),
            });

            if (!currentLease) {
                throw new RetentionLockLostError();
            }

            const batch = validateBatchResult(
                await adapter.executeBatch({
                    cutoffAt,
                    batchSize: config.batchSize,
                }),
            );

            if (batch.selected === 0) {
                break;
            }

            execution.counters.selected += batch.selected;
            execution.counters.processed += batch.processed;
            execution.counters.affected += batch.affected;
            execution.counters.skipped += batch.skipped;
            execution.counters.failed += batch.failed;
            execution.batchesProcessed += 1;

            await execution.save();

            currentLease = await renewRetentionLock({
                lease: currentLease,
                now: getClockDate(clock),
            });

            if (!currentLease) {
                throw new RetentionLockLostError();
            }

            if (batch.failed > 0) {
                throw new Error('Retention batch reported failed items');
            }

            if (batch.selected < config.batchSize) {
                break;
            }
        }

        execution.status = RETENTION_EXECUTION_STATUS.SUCCEEDED;
        execution.finishedAt = getClockDate(clock);
        execution.errorCode = null;
        await execution.save();

        return {
            executed: true,
            execution,
        };
    } catch (error) {
        execution.status = RETENTION_EXECUTION_STATUS.FAILED;
        execution.finishedAt = getClockDate(clock);
        execution.errorCode = getFailureCode(error);

        try {
            await execution.save();
        } catch {
            // Un worker ayant perdu sa lease peut avoir été fermé par le
            // nouveau détenteur via optimisticConcurrency. Ne pas réécrire.
        }

        throw error;
    }
};

const executeRetentionPolicy = async ({
    policy,
    trigger,
    initiatedBy = null,
    holderId,
    now = new Date(),
    clock = () => new Date(),
}) => {
    const normalizedPolicy = normalizeRetentionPolicy(policy);
    const lease = await acquireRetentionLock({
        targetKey: normalizedPolicy.config.targetKey,
        holderId,
        now,
    });

    if (!lease) {
        return {
            executed: false,
            reason: 'locked',
        };
    }

    try {
        await markInterruptedRetentionExecutions({
            targetKey: normalizedPolicy.config.targetKey,
            now,
        });

        return await executeRetentionPolicyWithLease({
            policy: normalizedPolicy,
            lease,
            trigger,
            initiatedBy,
            now,
            clock,
        });
    } finally {
        await releaseRetentionLock({
            lease,
            now: getClockDate(clock),
        });
    }
};

export {
    RetentionLockLostError,
    calculateRetentionCutoff,
    executeRetentionPolicy,
    executeRetentionPolicyWithLease,
    markInterruptedRetentionExecutions,
    normalizeRetentionPolicy,
    previewRetentionPolicy,
};
