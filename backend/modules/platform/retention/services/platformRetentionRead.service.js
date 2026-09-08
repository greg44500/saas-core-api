import mongoose from 'mongoose';

import {
    ACTIVE_RETENTION_TARGET_REGISTRY,
} from '../../../../config/applicationRetention.registry.js';
import { RetentionExecution } from '../../../retention/retentionExecution.model.js';
import { RetentionLock } from '../../../retention/retentionLock.model.js';
import {
    getCurrentRetentionPolicy,
} from '../../../retention/retentionPolicyRead.service.js';


const assertKnownTarget = (targetKey) => {
    const target =
        ACTIVE_RETENTION_TARGET_REGISTRY.getTargetDefinition(targetKey);

    if (!target) {
        throw new TypeError(`Unknown retention target: ${targetKey}`);
    }

    return target;
};

const serializePolicy = (policy) => {
    if (!policy) return null;

    return {
        id: policy._id?.toString?.() ?? String(policy._id),
        version: policy.version,
        config: policy.config,
        createdBy:
            policy.createdBy?.toString?.()
            ?? policy.createdBy
            ?? null,
        createdAt: policy.createdAt ?? null,
    };
};

const serializeExecution = (execution) => {
    if (!execution) return null;

    return {
        id: execution._id?.toString?.() ?? String(execution._id),
        policyId:
            execution.policy?.toString?.()
            ?? execution.policy
            ?? null,
        policyVersion: execution.policyVersion,
        targetKey: execution.policySnapshot?.targetKey ?? null,
        trigger: execution.trigger,
        initiatedBy:
            execution.initiatedBy?.toString?.()
            ?? execution.initiatedBy
            ?? null,
        startedAt: execution.startedAt,
        cutoffAt: execution.cutoffAt,
        status: execution.status,
        finishedAt: execution.finishedAt ?? null,
        counters: execution.counters,
        batchesProcessed: execution.batchesProcessed,
        lease: execution.lease
            ? {
                acquiredAt: execution.lease.acquiredAt,
                expiresAt: execution.lease.expiresAt,
            }
            : null,
        errorCode: execution.errorCode ?? null,
    };
};

const executionSafeProjection = [
    '_id',
    'policy',
    'policyVersion',
    'policySnapshot.targetKey',
    'trigger',
    'initiatedBy',
    'startedAt',
    'cutoffAt',
    'status',
    'finishedAt',
    'counters',
    'batchesProcessed',
    'lease.acquiredAt',
    'lease.expiresAt',
    'errorCode',
].join(' ');

const listPlatformRetentionTargets = async () => {
    const targets = await Promise.all(
        ACTIVE_RETENTION_TARGET_REGISTRY.definitions.map(
            async (target) => ({
                target,
                currentPolicy: serializePolicy(
                    await getCurrentRetentionPolicy({
                        targetKey: target.key,
                    }),
                ),
            }),
        ),
    );

    return targets;
};

const getPlatformRetentionState = async ({
    targetKey,
    now = new Date(),
}) => {
    const target = assertKnownTarget(targetKey);

    if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
        throw new TypeError('now must be a valid Date');
    }

    const [currentPolicy, latestExecution, activeLock] =
        await Promise.all([
            getCurrentRetentionPolicy({ targetKey }),
            RetentionExecution.findOne({
                'policySnapshot.targetKey': targetKey,
            })
                .sort({ startedAt: -1 })
                .select(executionSafeProjection)
                .lean(),
            RetentionLock.findOne({
                targetKey,
                expiresAt: mongoose.trusted({
                    $gt: now,
                }),
            })
                .select('expiresAt')
                .lean(),
        ]);

    return {
        target,
        currentPolicy: serializePolicy(currentPolicy),
        latestExecution: serializeExecution(latestExecution),
        runtime: {
            locked: Boolean(activeLock),
            lockExpiresAt: activeLock?.expiresAt ?? null,
        },
    };
};

const listPlatformRetentionExecutions = async ({
    targetKey,
    page,
    limit,
}) => {
    assertKnownTarget(targetKey);

    const filter = {
        'policySnapshot.targetKey': targetKey,
    };

    const [executions, total] = await Promise.all([
        RetentionExecution.find(filter)
            .sort({ startedAt: -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .select(executionSafeProjection)
            .lean(),
        RetentionExecution.countDocuments(filter),
    ]);

    return {
        executions: executions.map(serializeExecution),
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    };
};


export {
    getPlatformRetentionState,
    listPlatformRetentionExecutions,
    listPlatformRetentionTargets,
    serializeExecution,
    serializePolicy,
};
