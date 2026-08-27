import { AUTH_SESSION_REVOKED_REASON } from '../../../../constants/authSession.constants.js';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, AUDIT_STATUS } from '../../../../constants/auditActions.constants.js';
import { revokeAllUserAuthSessions } from '../../../authSessions/authSession.service.js';
import { createAuditLog } from '../../../auditLog/auditLog.service.js';
import { User } from '../../../users/user.model.js';
import { AppError } from '../../../../utils/appError.js';

const revokePlatformUserSessions = async ({
    userId,
    actorId,
    ipAddress = null,
    userAgent = null,
}) => {
    if (!userId || !actorId) {
        throw new TypeError(
            'userId and actorId are required to revoke platform user sessions',
        );
    }

    const user = await User.findById(userId).select('_id');

    if (!user) {
        throw new AppError('Utilisateur introuvable', 404);
    }

    const revocationResult = await revokeAllUserAuthSessions({
        userId: user._id,
        revokedReason: AUTH_SESSION_REVOKED_REASON.ADMIN_REVOKED,
    });

    try {
        await createAuditLog({
            actor: actorId,
            action: AUDIT_ACTION.SESSION_REVOKED,
            entityType: AUDIT_ENTITY_TYPE.USER,
            entityId: user._id,
            status: AUDIT_STATUS.SUCCESS,
            ipAddress,
            userAgent,
            metadata: {
                revokedReason: AUTH_SESSION_REVOKED_REASON.ADMIN_REVOKED,
                revokedSessionCount: revocationResult.modifiedCount,
            },
        });
    } catch (error) {
        console.error(
            'Platform session revocation audit failed',
            {
                action: AUDIT_ACTION.SESSION_REVOKED,
                errorName: error?.name,
            },
        );
    }

    return {
        userId: user._id.toString(),
        revokedSessionCount: revocationResult.modifiedCount,
    };
};

export { revokePlatformUserSessions };
