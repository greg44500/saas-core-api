import mongoose from 'mongoose';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, AUDIT_STATUS } from '../../../../constants/auditActions.constants.js';
import { USER_STATUS } from '../../../../constants/userStatus.constants.js';
import { createAuditLog } from '../../../auditLog/auditLog.service.js';
import { User } from '../../../users/user.model.js';
import { AppError } from '../../../../utils/appError.js';

const enablePlatformUser = async ({
    userId,
    actorId,
    ipAddress = null,
    userAgent = null,
}) => {
    if (!userId || !actorId) {
        throw new TypeError(
            'userId and actorId are required to enable a platform user',
        );
    }

    const now = new Date();
    let enabledUser;

    await mongoose.connection.transaction(async (session) => {
        enabledUser = await User.findOneAndUpdate(
            { _id: userId, status: USER_STATUS.DISABLED },
            {
                $set: {
                    status: USER_STATUS.ACTIVE,
                    disabledAt: null,
                    disabledBy: null,
                    disabledReason: null,
                    updatedBy: actorId,
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );

        if (!enabledUser) {
            const existingUser = await User.findById(userId)
                .session(session);

            if (!existingUser) {
                throw new AppError('Utilisateur introuvable', 404);
            }

            throw new AppError(
                'Cet utilisateur ne peut pas être réactivé dans son état actuel',
                409,
            );
        }

        await createAuditLog(
            {
                actor: actorId,
                action: AUDIT_ACTION.USER_ENABLED,
                entityType: AUDIT_ENTITY_TYPE.USER,
                entityId: enabledUser._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: { enabledAt: now },
            },
            { session },
        );
    });

    return {
        id: enabledUser._id.toString(),
        status: enabledUser.status,
    };
};

export { enablePlatformUser };
