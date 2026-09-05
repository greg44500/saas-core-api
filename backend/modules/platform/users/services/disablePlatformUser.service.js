import mongoose from 'mongoose';
import { AUTH_SESSION_REVOKED_REASON } from '../../../../constants/authSession.constants.js';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, AUDIT_STATUS } from '../../../../constants/auditActions.constants.js';
import { USER_STATUS } from '../../../../constants/userStatus.constants.js';
import { revokeAllUserAuthSessions } from '../../../authSessions/authSession.service.js';
import { createAuditLog } from '../../../auditLog/auditLog.service.js';
import {
    assertUserIsNotPlatformFounder,
} from '../../../platformTeam/platformFounderPolicy.service.js';
import { User } from '../../../users/user.model.js';
import { AppError } from '../../../../utils/appError.js';

const disablePlatformUser = async ({
    userId,
    actorId,
    disabledReason,
    ipAddress = null,
    userAgent = null,
}) => {
    if (!userId || !actorId || !disabledReason) {
        throw new TypeError(
            'userId, actorId and disabledReason are required '
            + 'to disable a platform user',
        );
    }

    if (userId.toString() === actorId.toString()) {
        throw new AppError(
            'Vous ne pouvez pas désactiver votre propre compte',
            409,
        );
    }

    const now = new Date();
    let disabledUser;

    await mongoose.connection.transaction(async (session) => {
        await assertUserIsNotPlatformFounder({
            userId,
            session,
        });

        disabledUser = await User.findOneAndUpdate(
            { _id: userId, status: USER_STATUS.ACTIVE },
            {
                $set: {
                    status: USER_STATUS.DISABLED,
                    disabledAt: now,
                    disabledBy: actorId,
                    disabledReason,
                    updatedBy: actorId,
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );

        if (!disabledUser) {
            const existingUser = await User.findById(userId)
                .session(session);

            if (!existingUser) {
                throw new AppError('Utilisateur introuvable', 404);
            }

            throw new AppError(
                'Cet utilisateur ne peut pas être désactivé dans son état actuel',
                409,
            );
        }

        const sessionRevocationResult = await revokeAllUserAuthSessions({
            userId: disabledUser._id,
            revokedReason: AUTH_SESSION_REVOKED_REASON.USER_DISABLED,
            session,
        });

        await createAuditLog(
            {
                actor: actorId,
                action: AUDIT_ACTION.USER_DISABLED,
                entityType: AUDIT_ENTITY_TYPE.USER,
                entityId: disabledUser._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    disabledReason,
                    revokedSessionCount: sessionRevocationResult.modifiedCount,
                },
            },
            { session },
        );
    });

    return {
        id: disabledUser._id.toString(),
        status: disabledUser.status,
        disabledAt: disabledUser.disabledAt,
        disabledReason: disabledUser.disabledReason,
    };
};

export { disablePlatformUser };
