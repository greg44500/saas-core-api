import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../constants/auditActions.constants.js';
import {
    AUTH_PROVIDER,
} from '../../../constants/authProvider.constants.js';
import {
    AUTH_SESSION_REVOKED_REASON,
} from '../../../constants/authSession.constants.js';
import {
    USER_STATUS,
} from '../../../constants/userStatus.constants.js';
import { AppError } from '../../../utils/appError.js';
import {
    hashPassword,
    verifyPassword,
} from '../../../utils/password.js';
import {
    createAuditLog,
} from '../../auditLog/auditLog.service.js';
import {
    AuthIdentity,
} from '../../authIdentities/authIdentity.model.js';
import {
    revokeAllUserAuthSessions,
} from '../../authSessions/authSession.service.js';
import { User } from '../../users/user.model.js';

/**
 * Modifie le mot de passe de l'utilisateur authentifié.
 *
 * Le hash, passwordChangedAt, la révocation des sessions et l'AuditLog
 * sont écrits dans une même transaction MongoDB. Aucun changement de
 * sécurité critique ne peut ainsi être validé sans sa trace d'audit.
 *
 * Le nouveau hash est calculé avant la transaction afin de limiter
 * sa durée et d'éviter d'y effectuer un calcul Argon2id coûteux.
 *
 * @param {object} input
 * @param {string|import('mongoose').Types.ObjectId} input.userId
 * @param {string} input.currentPassword
 * @param {string} input.newPassword
 * @param {string|null} [input.ipAddress]
 * @param {string|null} [input.userAgent]
 * @returns {Promise<{passwordChangedAt: Date}>}
 */
const changeUserPassword = async ({
    userId,
    currentPassword,
    newPassword,
    ipAddress = null,
    userAgent = null,
}) => {
    const authIdentityQuery = AuthIdentity.findOne({
        user: userId,
        provider: AUTH_PROVIDER.LOCAL,
    });

    const authIdentity =
        await authIdentityQuery.select(
            '+passwordHash',
        );

    /*
     * Le même refus est utilisé lorsque l'identité locale est absente
     * ou que le mot de passe actuel est incorrect.
     */
    if (!authIdentity) {
        throw new AppError(
            'Mot de passe actuel invalide',
            401,
        );
    }

    const currentPasswordIsValid =
        await verifyPassword(
            currentPassword,
            authIdentity.passwordHash,
        );

    if (!currentPasswordIsValid) {
        throw new AppError(
            'Mot de passe actuel invalide',
            401,
        );
    }

    /*
     * Un nouveau salt produirait un hash différent même si le mot de
     * passe brut était identique. La comparaison doit donc précéder
     * le calcul du nouveau hash.
     */
    const newPasswordIsCurrentPassword =
        await verifyPassword(
            newPassword,
            authIdentity.passwordHash,
        );

    if (newPasswordIsCurrentPassword) {
        throw new AppError(
            'Le nouveau mot de passe doit être différent',
            400,
        );
    }

    /*
     * Argon2id est volontairement coûteux. Le calcul reste hors de la
     * transaction afin de ne pas maintenir inutilement des verrous.
     */
    const newPasswordHash =
        await hashPassword(newPassword);

    const passwordChangedAt = new Date();

    await mongoose.connection.transaction(
        async (session) => {
            /*
             * Le hash lu précédemment fait partie du filtre pour détecter
             * une modification concurrente du credential.
             */
            const identityUpdateResult =
                await AuthIdentity.updateOne(
                    {
                        _id: authIdentity._id,
                        passwordHash:
                            authIdentity.passwordHash,
                    },
                    {
                        $set: {
                            passwordHash:
                                newPasswordHash,
                        },
                    },
                    {
                        session,
                    },
                );

            if (
                identityUpdateResult.modifiedCount !== 1
            ) {
                throw new AppError(
                    'Le mot de passe a été modifié simultanément',
                    409,
                );
            }

            /*
             * Les opérations nécessaires à la sécurité restent autorisées
             * pour un compte actif ou en demande de suppression.
             */
            const userUpdateResult =
                await User.updateOne(
                    {
                        _id: userId,
                        status: mongoose.trusted({
                            $in: [
                                USER_STATUS.ACTIVE,
                                USER_STATUS.DELETION_REQUESTED,
                            ],
                        }),
                    },
                    {
                        $set: {
                            passwordChangedAt,
                            updatedBy: userId,
                        },
                    },
                    {
                        session,
                    },
                );

            if (userUpdateResult.matchedCount !== 1) {
                throw new AppError(
                    'Utilisateur indisponible',
                    403,
                );
            }

            /*
             * Toute session créée avec l'ancien mot de passe doit devenir
             * inutilisable dans la même transaction.
             */
            const revocationResult =
                await revokeAllUserAuthSessions({
                    userId,
                    revokedReason:
                        AUTH_SESSION_REVOKED_REASON
                            .PASSWORD_CHANGED,
                    session,
                });

            /*
             * L'audit est strict et transactionnel. Une erreur d'écriture
             * entraîne le rollback de l'ensemble du changement de sécurité.
             */
            await createAuditLog(
                {
                    actor: userId,
                    action:
                        AUDIT_ACTION.PASSWORD_CHANGED,
                    entityType:
                        AUDIT_ENTITY_TYPE.USER,
                    entityId: userId,
                    status: AUDIT_STATUS.SUCCESS,
                    ipAddress,
                    userAgent,
                    metadata: {
                        changeMethod:
                            'authenticated',
                        revokedSessionCount:
                            revocationResult.modifiedCount,
                    },
                },
                {
                    session,
                },
            );
        },
    );

    return {
        passwordChangedAt,
    };
};

export {
    changeUserPassword,
};