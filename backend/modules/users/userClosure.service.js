import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import {
    AUTH_SESSION_REVOKED_REASON,
} from '../../constants/authSession.constants.js';
import { SYSTEM_ROLE_KEY } from '../../constants/role.constants.js';
import { USER_STATUS } from '../../constants/userStatus.constants.js';
import {
    WORKSPACE_STATUS,
} from '../../constants/workspace.constants.js';
import {
    WORKSPACE_MEMBER_STATUS,
} from '../../constants/workspaceMember.constants.js';
import { AppError } from '../../utils/appError.js';
import { canonicalizeEmail } from '../../utils/canonicalizeEmail.js';
import { createAuditLog } from '../auditLog/auditLog.service.js';
import {
    confirmCurrentUserPassword,
} from '../auth/services/confirmCurrentUserPassword.service.js';
import {
    revokeAllUserAuthSessions,
} from '../authSessions/authSession.service.js';
import {
    CORE_PLAN_METRIC,
} from '../plan/planCapability.registry.js';
import {
    releaseCurrentUsageMetric,
} from '../usageMetric/releaseUsageMetric.service.js';
import { WorkspaceMember } from '../workspaceMember/workspaceMember.model.js';
import { User } from './user.model.js';

const ACTIVE_MEMBERSHIP_STATUSES = Object.freeze([
    WORKSPACE_MEMBER_STATUS.ACTIVE,
    WORKSPACE_MEMBER_STATUS.SUSPENDED,
]);

const requestCurrentUserClosure = async ({
    userId,
    currentPassword,
    confirmationEmail,
    ipAddress = null,
    userAgent = null,
}) => {
    if (!userId || !currentPassword || !confirmationEmail) {
        throw new TypeError(
            'userId, currentPassword and confirmationEmail are required to request account closure',
        );
    }

    await confirmCurrentUserPassword({
        userId,
        password: currentPassword,
    });

    return mongoose.connection.transaction(async (session) => {
        const user = await User.findOne({
            _id: userId,
            status: USER_STATUS.ACTIVE,
        }).session(session);

        if (!user) {
            throw new AppError('Compte indisponible', 403);
        }

        if (canonicalizeEmail(confirmationEmail) !== user.emailCanonical) {
            throw new AppError(
                'L’adresse email de confirmation est incorrecte',
                409,
            );
        }

        const memberships = await WorkspaceMember.find({
            user: userId,
            status: mongoose.trusted({
                $in: ACTIVE_MEMBERSHIP_STATUSES,
            }),
        })
            .populate({
                path: 'role',
                select: '_id key isSystem workspace',
            })
            .populate({
                path: 'workspace',
                select: '_id status',
            })
            .session(session);

        const inconsistentMembership = memberships.find((membership) => (
            !membership.role
            || !membership.workspace
            || membership.role.workspace?.toString()
                !== membership.workspace._id.toString()
        ));

        if (inconsistentMembership) {
            throw new AppError(
                'Une appartenance workspace du compte est incohérente et doit être corrigée avant la fermeture',
                409,
            );
        }

        const ownedOpenWorkspace = memberships.find((membership) => (
            membership.role.isSystem
            && membership.role.key === SYSTEM_ROLE_KEY.OWNER
            && membership.workspace.status !== WORKSPACE_STATUS.CLOSED
        ));

        if (ownedOpenWorkspace) {
            throw new AppError(
                'Transférez ou fermez tous les workspaces dont vous êtes propriétaire avant de fermer votre compte',
                409,
            );
        }

        let removedMembershipCount = 0;

        for (const membership of memberships) {
            membership.status = WORKSPACE_MEMBER_STATUS.REMOVED;
            membership.updatedBy = userId;
            await membership.save({ session });

            await releaseCurrentUsageMetric({
                workspaceId: membership.workspace._id,
                metricKey: CORE_PLAN_METRIC.MEMBERS,
                amount: 1,
                actorId: userId,
                session,
            });

            await createAuditLog(
                {
                    actor: userId,
                    workspace: membership.workspace._id,
                    action: AUDIT_ACTION.MEMBER_REMOVED,
                    entityType: AUDIT_ENTITY_TYPE.WORKSPACE_MEMBER,
                    entityId: membership._id,
                    status: AUDIT_STATUS.SUCCESS,
                    ipAddress,
                    userAgent,
                    metadata: {
                        reason: 'account_closure_requested',
                    },
                },
                { session },
            );

            removedMembershipCount += 1;
        }

        const now = new Date();
        const updatedUser = await User.findOneAndUpdate(
            {
                _id: userId,
                status: USER_STATUS.ACTIVE,
            },
            {
                $set: {
                    status: USER_STATUS.DELETION_REQUESTED,
                    deletionRequestedAt: now,
                    deletionRequestedBy: userId,
                    updatedBy: userId,
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );

        if (!updatedUser) {
            throw new AppError(
                'Le compte a été modifié concurremment',
                409,
            );
        }

        const revokedSessions = await revokeAllUserAuthSessions({
            userId,
            revokedReason:
                AUTH_SESSION_REVOKED_REASON.USER_DELETION_REQUESTED,
            session,
        });

        await createAuditLog(
            {
                actor: userId,
                action: AUDIT_ACTION.USER_DELETION_REQUESTED,
                entityType: AUDIT_ENTITY_TYPE.USER,
                entityId: userId,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    removedMembershipCount,
                    revokedSessionCount: revokedSessions.modifiedCount,
                },
            },
            { session },
        );

        return {
            id: updatedUser._id.toString(),
            status: updatedUser.status,
            deletionRequestedAt: updatedUser.deletionRequestedAt,
            removedMembershipCount,
            revokedSessionCount: revokedSessions.modifiedCount,
        };
    });
};

export {
    ACTIVE_MEMBERSHIP_STATUSES,
    requestCurrentUserClosure,
};
