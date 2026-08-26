import mongoose from 'mongoose';

import {
    AUTH_SESSION_REVOKED_REASON,
} from '../../../constants/authSession.constants.js';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../constants/auditActions.constants.js';

import {
    USER_STATUS,
} from '../../../constants/userStatus.constants.js';

import {
    revokeAllUserAuthSessions,
} from '../../authSessions/authSession.service.js';

import {
    createAuditLog,
} from '../../auditLog/auditLog.service.js';

import { User } from '../../users/user.model.js';

import { AppError } from '../../../utils/appError.js';


/**
 * Désactive un utilisateur de la plateforme.
 *
 * La modification du User, la révocation de ses sessions actives
 * et l'AuditLog constituent une seule opération transactionnelle.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.actorId
 * @param {string} params.disabledReason
 * @param {string|null} [params.ipAddress]
 * @param {string|null} [params.userAgent]
 * @returns {Promise<object>}
 */
const disablePlatformUser = async ({
    userId,
    actorId,
    disabledReason,
    ipAddress = null,
    userAgent = null,
}) => {
    if (
        !userId
        || !actorId
        || !disabledReason
    ) {
        throw new TypeError(
            'userId, actorId and disabledReason are required '
            + 'to disable a platform user',
        );
    }

    /*
     * Un administrateur ne doit pas pouvoir désactiver
     * son propre compte depuis cette opération.
     *
     * Cela évite notamment de perdre accidentellement
     * l'accès administratif courant.
     */
    if (userId.toString() === actorId.toString()) {
        throw new AppError(
            'Vous ne pouvez pas désactiver votre propre compte',
            409,
        );
    }

    const now = new Date();

    let disabledUser;

    await mongoose.connection.transaction(
        async (session) => {
            /*
             * Seul un compte actif peut suivre la transition
             * ACTIVE → DISABLED.
             *
             * Le filtre protège également contre deux demandes
             * concurrentes de désactivation.
             */
            disabledUser =
                await User.findOneAndUpdate(
                    {
                        _id: userId,
                        status: USER_STATUS.ACTIVE,
                    },
                    {
                        $set: {
                            status:
                                USER_STATUS.DISABLED,
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
                    'Cet utilisateur ne peut pas être désactivé dans son état actuel',
                    409,
                );
            }

            /*
             * Une désactivation doit rendre inutilisables
             * toutes les sessions encore actives du compte.
             *
             * USER_DISABLED évite que cette révocation
             * soit interprétée comme un logout-all volontaire.
             */
            const sessionRevocationResult =
                await revokeAllUserAuthSessions({
                    userId:
                        disabledUser._id,
                    revokedReason:
                        AUTH_SESSION_REVOKED_REASON
                            .USER_DISABLED,
                    session,
                });

            /*
             * La désactivation et sa trace doivent être durables ensemble.
             * Un échec d'audit provoque donc le rollback complet.
             */
            await createAuditLog(
                {
                    actor: actorId,
                    action:
                        AUDIT_ACTION.USER_DISABLED,
                    entityType:
                        AUDIT_ENTITY_TYPE.USER,
                    entityId:
                        disabledUser._id,
                    status:
                        AUDIT_STATUS.SUCCESS,
                    ipAddress,
                    userAgent,
                    metadata: {
                        disabledReason,
                        revokedSessionCount:
                            sessionRevocationResult
                                .modifiedCount,
                    },
                },
                {
                    session,
                },
            );
        },
    );

    return {
        id: disabledUser._id.toString(),
        status: disabledUser.status,
        disabledAt: disabledUser.disabledAt,
        disabledReason:
            disabledUser.disabledReason,
    };
};


export {
    disablePlatformUser,
};