import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import { SYSTEM_ROLE_KEY } from '../../constants/role.constants.js';
import {
    SUBSCRIPTION_STATUS,
} from '../../constants/subscription.constants.js';
import {
    WORKSPACE_STATUS,
    WORKSPACE_STATUS_REASON,
} from '../../constants/workspace.constants.js';
import {
    WORKSPACE_MEMBER_STATUS,
} from '../../constants/workspaceMember.constants.js';
import { AppError } from '../../utils/appError.js';
import { createAuditLog } from '../auditLog/auditLog.service.js';
import {
    confirmCurrentUserPassword,
} from '../auth/services/confirmCurrentUserPassword.service.js';
import { Subscription } from '../subscriptions/subscription.model.js';
import { WorkspaceMember } from '../workspaceMember/workspaceMember.model.js';
import { Workspace } from './workspace.model.js';

const CLOSABLE_SUBSCRIPTION_STATUSES = Object.freeze([
    SUBSCRIPTION_STATUS.TRIALING,
    SUBSCRIPTION_STATUS.ACTIVE,
    SUBSCRIPTION_STATUS.PAST_DUE,
]);

const buildWorkspaceClosureDto = ({ workspace, canceledSubscriptionCount }) => ({
    id: workspace._id.toString(),
    status: workspace.status,
    statusReason: workspace.statusReason,
    statusReasonDetails: workspace.statusReasonDetails ?? null,
    statusChangedAt: workspace.statusChangedAt,
    canceledSubscriptionCount,
});

const assertValidAllowedStatuses = (allowedStatuses) => {
    if (!Array.isArray(allowedStatuses) || allowedStatuses.length === 0) {
        throw new TypeError('allowedStatuses must be a non-empty array');
    }

    const knownStatuses = new Set(Object.values(WORKSPACE_STATUS));
    const invalidStatus = allowedStatuses.find(
        (status) => !knownStatuses.has(status) || status === WORKSPACE_STATUS.CLOSED,
    );

    if (invalidStatus) {
        throw new TypeError(`Invalid closable workspace status: ${invalidStatus}`);
    }
};

const cancelWorkspaceSubscriptionsInSession = async ({
    workspaceId,
    actorId,
    now,
    session,
    ipAddress,
    userAgent,
}) => {
    const subscriptions = await Subscription.find({
        workspace: workspaceId,
        status: mongoose.trusted({
            $in: CLOSABLE_SUBSCRIPTION_STATUSES,
        }),
    }).session(session);

    let canceledSubscriptionCount = 0;

    for (const subscription of subscriptions) {
        const canceledSubscription = await Subscription.findOneAndUpdate(
            {
                _id: subscription._id,
                status: subscription.status,
            },
            {
                $set: {
                    status: SUBSCRIPTION_STATUS.CANCELED,
                    cancelAtPeriodEnd: false,
                    scheduledChange: null,
                    updatedBy: actorId,
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );

        if (!canceledSubscription) {
            throw new AppError(
                'Une souscription du workspace a été modifiée concurremment',
                409,
            );
        }

        await createAuditLog(
            {
                actor: actorId,
                workspace: workspaceId,
                action: AUDIT_ACTION.SUBSCRIPTION_CANCELED,
                entityType: AUDIT_ENTITY_TYPE.SUBSCRIPTION,
                entityId: canceledSubscription._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    mode: 'workspace_closed',
                    reason: 'workspace_closed',
                    previousStatus: subscription.status,
                    newStatus: SUBSCRIPTION_STATUS.CANCELED,
                    effectiveAt: now,
                },
            },
            { session },
        );

        canceledSubscriptionCount += 1;
    }

    return canceledSubscriptionCount;
};

const closeWorkspaceInSession = async ({
    workspaceId,
    actorId,
    statusReason,
    statusReasonDetails = null,
    allowedStatuses,
    expectedName = null,
    session,
    ipAddress = null,
    userAgent = null,
}) => {
    assertValidAllowedStatuses(allowedStatuses);

    const workspace = await Workspace.findById(workspaceId).session(session);

    if (!workspace) {
        throw new AppError('Workspace introuvable', 404);
    }

    if (workspace.status === WORKSPACE_STATUS.CLOSED) {
        return buildWorkspaceClosureDto({
            workspace,
            canceledSubscriptionCount: 0,
        });
    }

    if (!allowedStatuses.includes(workspace.status)) {
        throw new AppError(
            'Ce workspace ne peut pas être fermé dans son état actuel',
            409,
        );
    }

    if (
        expectedName !== null
        && workspace.name !== expectedName.trim()
    ) {
        throw new AppError(
            'Le nom de confirmation du workspace est incorrect',
            409,
        );
    }

    const now = new Date();

    const closedWorkspace = await Workspace.findOneAndUpdate(
        {
            _id: workspace._id,
            status: workspace.status,
        },
        {
            $set: {
                status: WORKSPACE_STATUS.CLOSED,
                statusReason,
                statusReasonDetails,
                statusChangedAt: now,
                statusChangedBy: actorId,
                updatedBy: actorId,
            },
        },
        {
            returnDocument: 'after',
            runValidators: true,
            session,
        },
    );

    if (!closedWorkspace) {
        throw new AppError(
            'Le workspace a été modifié concurremment',
            409,
        );
    }

    const canceledSubscriptionCount =
        await cancelWorkspaceSubscriptionsInSession({
            workspaceId: workspace._id,
            actorId,
            now,
            session,
            ipAddress,
            userAgent,
        });

    await createAuditLog(
        {
            actor: actorId,
            workspace: workspace._id,
            action: AUDIT_ACTION.WORKSPACE_CLOSED,
            entityType: AUDIT_ENTITY_TYPE.WORKSPACE,
            entityId: workspace._id,
            status: AUDIT_STATUS.SUCCESS,
            ipAddress,
            userAgent,
            metadata: {
                previousStatus: workspace.status,
                statusReason,
                statusReasonDetails,
                canceledSubscriptionCount,
            },
        },
        { session },
    );

    return buildWorkspaceClosureDto({
        workspace: closedWorkspace,
        canceledSubscriptionCount,
    });
};

const closeWorkspaceByOwner = async ({
    workspaceId,
    actorId,
    currentPassword,
    confirmationName,
    ipAddress = null,
    userAgent = null,
}) => {
    if (!workspaceId || !actorId || !currentPassword || !confirmationName) {
        throw new TypeError(
            'workspaceId, actorId, currentPassword and confirmationName are required to close a workspace',
        );
    }

    await confirmCurrentUserPassword({
        userId: actorId,
        password: currentPassword,
    });

    return mongoose.connection.transaction(async (session) => {
        const ownerMembership = await WorkspaceMember.findOne({
            workspace: workspaceId,
            user: actorId,
            status: WORKSPACE_MEMBER_STATUS.ACTIVE,
        })
            .populate({
                path: 'role',
                match: {
                    key: SYSTEM_ROLE_KEY.OWNER,
                    isSystem: true,
                },
                select: '_id key isSystem workspace',
            })
            .session(session);

        if (!ownerMembership?.role) {
            throw new AppError(
                'Seul le propriétaire actuel peut fermer le workspace',
                403,
            );
        }

        return closeWorkspaceInSession({
            workspaceId,
            actorId,
            statusReason: WORKSPACE_STATUS_REASON.OWNER_REQUEST,
            allowedStatuses: [WORKSPACE_STATUS.ACTIVE],
            expectedName: confirmationName,
            session,
            ipAddress,
            userAgent,
        });
    });
};

const closeWorkspaceByPlatform = async ({
    workspaceId,
    actorId,
    statusReason,
    statusReasonDetails = null,
    ipAddress = null,
    userAgent = null,
}) => {
    if (!workspaceId || !actorId || !statusReason) {
        throw new TypeError(
            'workspaceId, actorId and statusReason are required to close a platform workspace',
        );
    }

    return mongoose.connection.transaction((session) =>
        closeWorkspaceInSession({
            workspaceId,
            actorId,
            statusReason,
            statusReasonDetails,
            allowedStatuses: [
                WORKSPACE_STATUS.ACTIVE,
                WORKSPACE_STATUS.SUSPENDED,
                WORKSPACE_STATUS.ARCHIVED,
            ],
            session,
            ipAddress,
            userAgent,
        }));
};

export {
    CLOSABLE_SUBSCRIPTION_STATUSES,
    closeWorkspaceByOwner,
    closeWorkspaceByPlatform,
    closeWorkspaceInSession,
};
