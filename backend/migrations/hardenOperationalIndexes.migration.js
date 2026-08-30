import { isDeepStrictEqual } from 'node:util';

import { FILE_STATUS } from '../constants/file.constants.js';
import { AuditLog } from '../modules/auditLog/auditLog.model.js';
import { File } from '../modules/file/file.model.js';
import { Plan } from '../modules/plan/plan.model.js';
import { Subscription } from '../modules/subscriptions/subscription.model.js';
import { User } from '../modules/users/user.model.js';
import { Workspace } from '../modules/workspace/workspace.model.js';
import { WorkspaceMember } from '../modules/workspaceMember/workspaceMember.model.js';

const hasExpectedIndex = ({ indexes, key, partialFilterExpression }) =>
    indexes.some((index) =>
        isDeepStrictEqual(index.key, key)
        && (
            partialFilterExpression === undefined
            || isDeepStrictEqual(
                index.partialFilterExpression,
                partialFilterExpression,
            )
        ));

const ensureIndex = async ({
    collection,
    indexes,
    key,
    name,
    partialFilterExpression,
}) => {
    if (hasExpectedIndex({ indexes, key, partialFilterExpression })) {
        return false;
    }

    const options = {
        name,
        ...(partialFilterExpression === undefined
            ? {}
            : { partialFilterExpression }),
    };

    await collection.createIndex(key, options);

    return true;
};

/**
 * Provisionne les index directement alignés sur les tris stables et les lots
 * bornés utilisés par le Core V1.
 *
 * Cette migration est volontairement additive. Les anciens index préfixes ne
 * sont pas supprimés ici car `autoIndex` peut encore les recréer au démarrage.
 * Leur éventuel retrait doit être effectué seulement après le durcissement de
 * la stratégie d'indexation Mongoose en production.
 */
const hardenOperationalIndexes = async () => {
    const collections = {
        subscription: {
            collection: Subscription.collection,
            indexes: await Subscription.collection.indexes(),
        },
        file: {
            collection: File.collection,
            indexes: await File.collection.indexes(),
        },
        user: {
            collection: User.collection,
            indexes: await User.collection.indexes(),
        },
        workspace: {
            collection: Workspace.collection,
            indexes: await Workspace.collection.indexes(),
        },
        workspaceMember: {
            collection: WorkspaceMember.collection,
            indexes: await WorkspaceMember.collection.indexes(),
        },
        plan: {
            collection: Plan.collection,
            indexes: await Plan.collection.indexes(),
        },
        auditLog: {
            collection: AuditLog.collection,
            indexes: await AuditLog.collection.indexes(),
        },
    };

    const specs = [
        {
            target: 'subscription',
            name: 'subscription_trial_expiration_batch_v2',
            key: { kind: 1, status: 1, trialEndsAt: 1, _id: 1 },
        },
        {
            target: 'subscription',
            name: 'subscription_scheduled_cancellation_batch_v2',
            key: {
                kind: 1,
                status: 1,
                cancelAtPeriodEnd: 1,
                currentPeriodEnd: 1,
                _id: 1,
            },
        },
        {
            target: 'subscription',
            name: 'subscription_scheduled_downgrade_batch_v2',
            key: {
                kind: 1,
                status: 1,
                'scheduledChange.type': 1,
                'scheduledChange.effectiveAt': 1,
                _id: 1,
            },
        },
        {
            target: 'subscription',
            name: 'subscription_platform_created_at',
            key: { createdAt: -1, _id: -1 },
        },
        {
            target: 'file',
            name: 'files_pending_purge_v2',
            key: { purgeScheduledAt: 1, _id: 1 },
            partialFilterExpression: { status: FILE_STATUS.DELETED },
        },
        {
            target: 'file',
            name: 'files_workspace_active_created_at',
            key: {
                workspace: 1,
                status: 1,
                createdAt: -1,
                _id: -1,
            },
        },
        {
            target: 'user',
            name: 'users_platform_created_at',
            key: { createdAt: -1, _id: -1 },
        },
        {
            target: 'workspace',
            name: 'workspaces_platform_created_at',
            key: { createdAt: -1, _id: -1 },
        },
        {
            target: 'workspaceMember',
            name: 'workspace_members_joined_at',
            key: {
                workspace: 1,
                status: 1,
                joinedAt: 1,
                _id: 1,
            },
        },
        {
            target: 'plan',
            name: 'plans_platform_display_order',
            key: {
                displayOrder: 1,
                createdAt: 1,
                _id: 1,
            },
        },
        {
            target: 'auditLog',
            name: 'audit_logs_global_created_at',
            key: { createdAt: -1, _id: -1 },
        },
        {
            target: 'auditLog',
            name: 'audit_logs_workspace_created_at',
            key: { workspace: 1, createdAt: -1, _id: -1 },
        },
    ];

    const created = [];

    for (const spec of specs) {
        const target = collections[spec.target];
        const wasCreated = await ensureIndex({
            collection: target.collection,
            indexes: target.indexes,
            key: spec.key,
            name: spec.name,
            partialFilterExpression: spec.partialFilterExpression,
        });

        if (wasCreated) {
            created.push(spec.name);
        }
    }

    return {
        created,
        createdCount: created.length,
        totalExpected: specs.length,
    };
};

export {
    hardenOperationalIndexes,
};
