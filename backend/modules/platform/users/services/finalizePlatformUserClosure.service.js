import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../../constants/auditActions.constants.js';
import {
    AUTH_SESSION_REVOKED_REASON,
} from '../../../../constants/authSession.constants.js';
import { SYSTEM_ROLE_KEY } from '../../../../constants/role.constants.js';
import { USER_STATUS } from '../../../../constants/userStatus.constants.js';
import { WORKSPACE_STATUS } from '../../../../constants/workspace.constants.js';
import {
    WORKSPACE_MEMBER_STATUS,
} from '../../../../constants/workspaceMember.constants.js';
import { AppError } from '../../../../utils/appError.js';
import { createAuditLog } from '../../../auditLog/auditLog.service.js';
import {
    revokeAllUserAuthSessions,
} from '../../../authSessions/authSession.service.js';
import { User } from '../../../users/user.model.js';
import { WorkspaceMember } from '../../../workspaceMember/workspaceMember.model.js';

const finalizePlatformUserClosure = async ({
    userId,
    actorId,
    reason,
    ipAddress = null,
    userAgent = null,
}) => {
    if (!userId || !actorId || !reason) {
        throw new TypeError(
            'userId, actorId and reason are required to finalize account closure',
        );
    }

    return mongoose.connection.transaction(async (session) => {
        const user = await User.findOne({
            _id: userId,
            status: USER_STATUS.DELETION_REQUESTED,
        }).session(session);

        if (!user) {
            const existingUser = await User.findById(userId).session(session);

            if (!existingUser) {
                throw new AppError('Utilisateur introuvable', 404);
            }

            if (existingUser.status === USER_STATUS.CLOSED) {
                return {
                    id: existingUser._id.toString(),
                    status: existingUser.status,
                    closedAt: existingUser.closedAt,
                };
            }

            throw new AppError(
                'Seul un compte en attente de fermeture peut être clôturé',
                409,
            );
        }

        const remainingMemberships = await WorkspaceMember.find({
            user: userId,
            status: mongoose.trusted({
                $in: [
                    WORKSPACE_MEMBER_STATUS.ACTIVE,
                    WORKSPACE_MEMBER_STATUS.SUSPENDED,
                ],
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

        const ownedOpenWorkspace = remainingMemberships.find((membership) => (
            membership.role?.isSystem
            && membership.role?.key === SYSTEM_ROLE_KEY.OWNER
            && membership.workspace
            && membership.workspace.status !== WORKSPACE_STATUS.CLOSED
        ));

        if (ownedOpenWorkspace) {
            throw new AppError(
                'Le compte possède encore un workspace ouvert',
                409,
            );
        }

        if (remainingMemberships.length > 0) {
            throw new AppError(
                'Le compte possède encore des appartenances actives à des workspaces',
                409,
            );
        }

        const now = new Date();
        const closedUser = await User.findOneAndUpdate(
            {
                _id: userId,
                status: USER_STATUS.DELETION_REQUESTED,
            },
            {
                $set: {
                    status: USER_STATUS.CLOSED,
                    closedAt: now,
                    closedBy: actorId,
                    closureReason: reason,
                    updatedBy: actorId,
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );

        if (!closedUser) {
            throw new AppError(
                'Le compte a été modifié concurremment',
                409,
            );
        }

        const revokedSessions = await revokeAllUserAuthSessions({
            userId,
            revokedReason: AUTH_SESSION_REVOKED_REASON.USER_CLOSED,
            session,
        });

        await createAuditLog(
            {
                actor: actorId,
                action: AUDIT_ACTION.USER_CLOSED,
                entityType: AUDIT_ENTITY_TYPE.USER,
                entityId: userId,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    reason,
                    revokedSessionCount: revokedSessions.modifiedCount,
                },
            },
            { session },
        );

        return {
            id: closedUser._id.toString(),
            status: closedUser.status,
            closedAt: closedUser.closedAt,
        };
    });
};

export { finalizePlatformUserClosure };
