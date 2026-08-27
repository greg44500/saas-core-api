import mongoose from 'mongoose';
import { AUTH_SESSION_REVOKED_REASON } from '../../../../constants/authSession.constants.js';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, AUDIT_STATUS } from '../../../../constants/auditActions.constants.js';
import { PLATFORM_ROLE } from '../../../../constants/platformRoles.constants.js';
import { revokeAllUserAuthSessions } from '../../../authSessions/authSession.service.js';
import { createAuditLog } from '../../../auditLog/auditLog.service.js';
import { User } from '../../../users/user.model.js';
import { AppError } from '../../../../utils/appError.js';

const updatePlatformUserRole = async ({
    userId,
    actorId,
    platformRole,
    ipAddress = null,
    userAgent = null,
}) => {
    if (!userId || !actorId || !platformRole) {
        throw new TypeError(
            'userId, actorId and platformRole are required '
            + 'to update a platform user role',
        );
    }

    if (!Object.values(PLATFORM_ROLE).includes(platformRole)) {
        throw new TypeError('platformRole is invalid');
    }

    let updatedUser;

    await mongoose.connection.transaction(async (session) => {
        const currentUser = await User.findById(userId).session(session);

        if (!currentUser) {
            throw new AppError('Utilisateur introuvable', 404);
        }

        const previousPlatformRole = currentUser.platformRole;

        if (previousPlatformRole === platformRole) {
            throw new AppError(
                'Le rôle plateforme est déjà attribué à cet utilisateur',
                409,
            );
        }

        if (
            currentUser._id.toString() === actorId.toString()
            && platformRole !== PLATFORM_ROLE.SUPER_ADMIN
        ) {
            throw new AppError(
                'Vous ne pouvez pas rétrograder votre propre rôle plateforme',
                409,
            );
        }

        if (
            previousPlatformRole === PLATFORM_ROLE.SUPER_ADMIN
            && platformRole !== PLATFORM_ROLE.SUPER_ADMIN
        ) {
            const superAdminCount = await User.countDocuments({
                platformRole: PLATFORM_ROLE.SUPER_ADMIN,
            }).session(session);

            if (superAdminCount <= 1) {
                throw new AppError(
                    'Le dernier super-admin ne peut pas être rétrogradé',
                    409,
                );
            }
        }

        updatedUser = await User.findOneAndUpdate(
            { _id: userId, platformRole: previousPlatformRole },
            { $set: { platformRole, updatedBy: actorId } },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );

        if (!updatedUser) {
            throw new AppError(
                'Le rôle plateforme a été modifié par une autre opération',
                409,
            );
        }

        const sessionRevocationResult = await revokeAllUserAuthSessions({
            userId: updatedUser._id,
            revokedReason: AUTH_SESSION_REVOKED_REASON.ADMIN_REVOKED,
            session,
        });

        await createAuditLog(
            {
                actor: actorId,
                action: AUDIT_ACTION.USER_PLATFORM_ROLE_UPDATED,
                entityType: AUDIT_ENTITY_TYPE.USER,
                entityId: updatedUser._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: {
                    previousPlatformRole,
                    newPlatformRole: platformRole,
                    revokedSessionCount: sessionRevocationResult.modifiedCount,
                },
            },
            { session },
        );
    });

    return {
        id: updatedUser._id.toString(),
        platformRole: updatedUser.platformRole,
    };
};

export { updatePlatformUserRole };
