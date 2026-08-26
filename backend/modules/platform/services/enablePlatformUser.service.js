import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../constants/auditActions.constants.js';

import {
    USER_STATUS,
} from '../../../constants/userStatus.constants.js';

import {
    createAuditLog,
} from '../../auditLog/auditLog.service.js';

import { User } from '../../users/user.model.js';

import { AppError } from '../../../utils/appError.js';


/**
 * Réactive un utilisateur précédemment désactivé.
 *
 * La réactivation et son AuditLog appartiennent à la même transaction
 * afin d'éviter une mutation administrative non tracée.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.actorId
 * @param {string|null} [params.ipAddress]
 * @param {string|null} [params.userAgent]
 * @returns {Promise<object>}
 */
const enablePlatformUser = async ({
    userId,
    actorId,
    ipAddress = null,
    userAgent = null,
}) => {
    if (!userId || !actorId) {
        throw new TypeError(
            'userId and actorId are required '
            + 'to enable a platform user',
        );
    }

    const now = new Date();

    let enabledUser;

    await mongoose.connection.transaction(
        async (session) => {
            /*
             * Seul un compte actuellement désactivé peut être réactivé.
             *
             * Le filtre sert aussi de verrou logique contre deux
             * demandes concurrentes de réactivation.
             */
            enabledUser =
                await User.findOneAndUpdate(
                    {
                        _id: userId,
                        status: USER_STATUS.DISABLED,
                    },
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
                const existingUser =
                    await User.findById(userId)
                        .session(session);

                if (!existingUser) {
                    throw new AppError(
                        'Utilisateur introuvable',
                        404,
                    );
                }

                throw new AppError(
                    'Cet utilisateur ne peut pas être réactivé dans son état actuel',
                    409,
                );
            }

            /*
             * Une réactivation administrative sensible ne doit jamais
             * être persistée sans sa trace d'audit correspondante.
             */
            await createAuditLog(
                {
                    actor: actorId,
                    action:
                        AUDIT_ACTION.USER_ENABLED,
                    entityType:
                        AUDIT_ENTITY_TYPE.USER,
                    entityId:
                        enabledUser._id,
                    status:
                        AUDIT_STATUS.SUCCESS,
                    ipAddress,
                    userAgent,
                    metadata: {
                        enabledAt: now,
                    },
                },
                {
                    session,
                },
            );
        },
    );

    return {
        id: enabledUser._id.toString(),
        status: enabledUser.status,
    };
};


export {
    enablePlatformUser,
};