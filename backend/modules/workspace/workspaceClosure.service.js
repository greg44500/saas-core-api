import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import { SYSTEM_ROLE_KEY } from '../../constants/role.constants.js';
import {
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_STATUS,
} from '../../constants/subscription.constants.js';
import {
    WORKSPACE_STATUS,
    WORKSPACE_STATUS_REASON,
} from '../../constants/workspace.constants.js';
import {
    WORKSPACE_INVITATION_STATUS,
} from '../../constants/workspaceInvitation.constants.js';
import {
    WORKSPACE_MEMBER_STATUS,
} from '../../constants/workspaceMember.constants.js';
import { AppError } from '../../utils/appError.js';
import { createAuditLog } from '../auditLog/auditLog.service.js';
import {
    confirmCurrentUserPassword,
} from '../auth/services/confirmCurrentUserPassword.service.js';
import { Subscription } from '../subscriptions/subscription.model.js';
import {
    WorkspaceInvitation,
} from '../workspaceInvitation/workspaceInvitation.model.js';
import { WorkspaceMember } from '../workspaceMember/workspaceMember.model.js';
import { Workspace } from './workspace.model.js';

const CLOSABLE_SUBSCRIPTION_STATUSES = Object.freeze([
    SUBSCRIPTION_STATUS.TRIALING,
    SUBSCRIPTION_STATUS.ACTIVE,
    SUBSCRIPTION_STATUS.PAST_DUE,
]);

const buildWorkspaceLifecycleDto = ({
    workspace,
    canceledSubscriptionCount,
    revokedInvitationCount,
}) => ({
    id: workspace._id.toString(),
    status: workspace.status,
    statusReason: workspace.statusReason,
    statusReasonDetails: workspace.statusReasonDetails ?? null,
    statusChangedAt: workspace.statusChangedAt,
    canceledSubscriptionCount,
    revokedInvitationCount,
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
        throw new TypeError(`Invalid workspace source status: ${invalidStatus}`);
    }
};

const assertValidTargetStatus = (targetStatus) => {
    if (![
        WORKSPACE_STATUS.ARCHIVED,
        WORKSPACE_STATUS.CLOSED,
    ].includes(targetStatus)) {
        throw new TypeError(`Invalid workspace target status: ${targetStatus}`);
    }
};

const cancelWorkspaceSubscriptionsInSession = async ({
    workspaceId,
    actorId,
    now,
    session,
    ipAddress,
    userAgent,
    lifecycleReason,
    subscriptionKinds = null,
}) => {
    const query = {
        workspace: workspaceId,
        status: mongoose.trusted({
            $in: CLOSABLE_SUBSCRIPTION_STATUSES,
        }),
    };

    if (subscriptionKinds) {
        query.kind = mongoose.trusted({
            $in: subscriptionKinds,
        });
    }

    const subscriptions = await Subscription.find(query).session(session);

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
                    mode: lifecycleReason,
                    reason: lifecycleReason,
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

const revokeWorkspaceInvitationsInSession = async ({
    workspaceId,
    actorId,
    now,
    session,
    ipAddress,
    userAgent,
    lifecycleReason = 'workspace_closed',
}) => {
    const pendingInvitations = await WorkspaceInvitation.find({
        workspace: workspaceId,
        status: WORKSPACE_INVITATION_STATUS.PENDING,
    }).session(session);

    let revokedInvitationCount = 0;

    for (const invitation of pendingInvitations) {
        const revokedInvitation = await WorkspaceInvitation.findOneAndUpdate(
            {
                _id: invitation._id,
                status: WORKSPACE_INVITATION_STATUS.PENDING,
            },
            {
                $set: {
                    status: WORKSPACE_INVITATION_STATUS.REVOKED,
                    revokedAt: now,
                    revokedBy: actorId,
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );

        if (!revokedInvitation) {
            throw new AppError(
                'Une invitation du workspace a été modifiée concurremment',
                409,
            );
        }

        await createAuditLog(
            {
                actor: actorId,
                workspace: workspaceId,
                action: AUDIT_ACTION.MEMBER_INVITATION_REVOKED,
                entityType: AUDIT_ENTITY_TYPE.WORKSPACE_INVITATION,
                entityId: invitation._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    reason: lifecycleReason,
                },
            },
            { session },
        );

        revokedInvitationCount += 1;
    }

    return revokedInvitationCount;
};

const transitionWorkspaceLifecycleInSession = async ({
    workspaceId,
    actorId,
    targetStatus,
    auditAction,
    lifecycleReason,
    statusReason,
    statusReasonDetails = null,
    allowedStatuses,
    expectedName = null,
    subscriptionKinds = null,
    session,
    ipAddress = null,
    userAgent = null,
}) => {
    assertValidAllowedStatuses(allowedStatuses);
    assertValidTargetStatus(targetStatus);

    const workspace = await Workspace.findById(workspaceId).session(session);

    if (!workspace) {
        throw new AppError('Workspace introuvable', 404);
    }

    if (workspace.status === targetStatus) {
        return buildWorkspaceLifecycleDto({
            workspace,
            canceledSubscriptionCount: 0,
            revokedInvitationCount: 0,
        });
    }

    if (!allowedStatuses.includes(workspace.status)) {
        throw new AppError(
            'Ce workspace ne peut pas changer vers cet état dans sa situation actuelle',
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

    const updatedWorkspace = await Workspace.findOneAndUpdate(
        {
            _id: workspace._id,
            status: workspace.status,
        },
        {
            $set: {
                status: targetStatus,
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

    if (!updatedWorkspace) {
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
            lifecycleReason,
            subscriptionKinds,
        });

    const revokedInvitationCount =
        await revokeWorkspaceInvitationsInSession({
            workspaceId: workspace._id,
            actorId,
            now,
            session,
            ipAddress,
            userAgent,
            lifecycleReason,
        });

    await createAuditLog(
        {
            actor: actorId,
            workspace: workspace._id,
            action: auditAction,
            entityType: AUDIT_ENTITY_TYPE.WORKSPACE,
            entityId: workspace._id,
            status: AUDIT_STATUS.SUCCESS,
            ipAddress,
            userAgent,
            metadata: {
                previousStatus: workspace.status,
                newStatus: targetStatus,
                statusReason,
                statusReasonDetails,
                canceledSubscriptionCount,
                revokedInvitationCount,
            },
        },
        { session },
    );

    return buildWorkspaceLifecycleDto({
        workspace: updatedWorkspace,
        canceledSubscriptionCount,
        revokedInvitationCount,
    });
};

const archiveWorkspaceInSession = async ({
    workspaceId,
    actorId,
    statusReason = WORKSPACE_STATUS_REASON.OWNER_REQUEST,
    statusReasonDetails = null,
    allowedStatuses = [WORKSPACE_STATUS.ACTIVE],
    expectedName = null,
    session,
    ipAddress = null,
    userAgent = null,
}) => transitionWorkspaceLifecycleInSession({
    workspaceId,
    actorId,
    targetStatus: WORKSPACE_STATUS.ARCHIVED,
    auditAction: AUDIT_ACTION.WORKSPACE_ARCHIVED,
    lifecycleReason: 'workspace_archived',
    statusReason,
    statusReasonDetails,
    allowedStatuses,
    expectedName,
    subscriptionKinds: [SUBSCRIPTION_KIND.COMMERCIAL],
    session,
    ipAddress,
    userAgent,
});

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
}) => transitionWorkspaceLifecycleInSession({
    workspaceId,
    actorId,
    targetStatus: WORKSPACE_STATUS.CLOSED,
    auditAction: AUDIT_ACTION.WORKSPACE_CLOSED,
    lifecycleReason: 'workspace_closed',
    statusReason,
    statusReasonDetails,
    allowedStatuses,
    expectedName,
    session,
    ipAddress,
    userAgent,
});

const archiveWorkspaceByOwner = async ({
    workspaceId,
    actorId,
    currentPassword,
    confirmationName,
    ipAddress = null,
    userAgent = null,
}) => {
    if (!workspaceId || !actorId || !currentPassword || !confirmationName) {
        throw new TypeError(
            'workspaceId, actorId, currentPassword and confirmationName are required to archive a workspace',
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
                'Seul le propriétaire actuel peut archiver le workspace',
                403,
            );
        }

        return archiveWorkspaceInSession({
            workspaceId,
            actorId,
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
    archiveWorkspaceByOwner,
    archiveWorkspaceInSession,
    closeWorkspaceByPlatform,
    closeWorkspaceInSession,
    revokeWorkspaceInvitationsInSession,
    transitionWorkspaceLifecycleInSession,
};
