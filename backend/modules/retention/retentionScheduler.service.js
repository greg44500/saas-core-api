import {
    ACTIVE_RETENTION_TARGET_REGISTRY,
} from '../../config/applicationRetention.registry.js';
import {
    RETENTION_EXECUTION_STATUS,
    RETENTION_EXECUTION_TRIGGER,
} from '../../constants/retention.constants.js';
import {
    executeRetentionPolicyWithLease,
    markInterruptedRetentionExecutions,
    normalizeRetentionPolicy,
} from './retentionEngine.service.js';
import { RetentionExecution } from './retentionExecution.model.js';
import {
    acquireRetentionLock,
    releaseRetentionLock,
} from './retentionLock.service.js';
import {
    getCurrentRetentionPolicy,
} from './retentionPolicyRead.service.js';
import {
    RETENTION_CAPABILITY,
} from './retentionTarget.registry.js';

const assertValidDate = (value, name) => {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
        throw new TypeError(`${name} must be a valid Date`);
    }
};

const getNextScheduledAt = ({
    lastStartedAt,
    intervalMinutes,
}) => new Date(
    lastStartedAt.getTime() + intervalMinutes * 60 * 1000,
);

const isPolicyScheduled = (policy) =>
    policy
    && policy.config?.enabled === true
    && policy.config?.schedule !== null;

/**
 * Une seconde instance peut avoir calculé qu'une policy était due avant nous.
 * La décision finale est donc recalculée après acquisition du lock target.
 */
const runScheduledRetentionTarget = async ({
    targetKey,
    holderId,
    now = new Date(),
    clock = () => new Date(),
}) => {
    assertValidDate(now, 'now');

    const target = ACTIVE_RETENTION_TARGET_REGISTRY.getTargetDefinition(
        targetKey,
    );

    if (
        !target
        || !target.capabilities.includes(
            RETENTION_CAPABILITY.SCHEDULED_EXECUTION,
        )
    ) {
        return {
            targetKey,
            status: 'unsupported',
        };
    }

    const initialPolicy = await getCurrentRetentionPolicy({
        targetKey,
    });

    if (!isPolicyScheduled(initialPolicy)) {
        return {
            targetKey,
            status: initialPolicy ? 'not_scheduled' : 'no_policy',
        };
    }

    const lease = await acquireRetentionLock({
        targetKey,
        holderId,
        now,
    });

    if (!lease) {
        return {
            targetKey,
            status: 'locked',
        };
    }

    try {
        await markInterruptedRetentionExecutions({
            targetKey,
            now,
        });

        const currentPolicy = await getCurrentRetentionPolicy({
            targetKey,
        });

        if (!isPolicyScheduled(currentPolicy)) {
            return {
                targetKey,
                status: currentPolicy
                    ? 'not_scheduled'
                    : 'no_policy',
            };
        }

        const normalizedPolicy = normalizeRetentionPolicy(
            currentPolicy,
        );

        const lastExecution = await RetentionExecution.findOne({
            policy: normalizedPolicy._id,
            trigger: RETENTION_EXECUTION_TRIGGER.SCHEDULED,
            status: RETENTION_EXECUTION_STATUS.SUCCEEDED,
        })
            .sort({ startedAt: -1 })
            .lean();

        if (lastExecution?.startedAt instanceof Date) {
            const nextScheduledAt = getNextScheduledAt({
                lastStartedAt: lastExecution.startedAt,
                intervalMinutes:
                    normalizedPolicy.config.schedule.intervalMinutes,
            });

            if (nextScheduledAt > now) {
                return {
                    targetKey,
                    status: 'not_due',
                    nextScheduledAt,
                };
            }
        }

        const result = await executeRetentionPolicyWithLease({
            policy: normalizedPolicy,
            lease,
            trigger: RETENTION_EXECUTION_TRIGGER.SCHEDULED,
            initiatedBy: null,
            now,
            clock,
        });

        return {
            targetKey,
            status: 'executed',
            executionId: result.execution._id,
        };
    } finally {
        await releaseRetentionLock({
            lease,
            now: clock(),
        });
    }
};

const runScheduledRetentionPolicies = async ({
    holderId,
    now = new Date(),
    clock = () => new Date(),
} = {}) => {
    assertValidDate(now, 'now');

    const targets = ACTIVE_RETENTION_TARGET_REGISTRY.definitions
        .filter(({ capabilities }) =>
            capabilities.includes(
                RETENTION_CAPABILITY.SCHEDULED_EXECUTION,
            ))
        .map(({ key }) => key);

    const results = [];

    for (const targetKey of targets) {
        try {
            results.push(
                await runScheduledRetentionTarget({
                    targetKey,
                    holderId,
                    now,
                    clock,
                }),
            );
        } catch {
            results.push({
                targetKey,
                status: 'failed',
            });
        }
    }

    return {
        targets: results.length,
        executed: results.filter(
            ({ status }) => status === 'executed',
        ).length,
        failed: results.filter(
            ({ status }) => status === 'failed',
        ).length,
        results,
    };
};

export {
    runScheduledRetentionPolicies,
    runScheduledRetentionTarget,
};
