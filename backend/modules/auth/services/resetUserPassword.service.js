import mongoose from 'mongoose';

import {
    AUTH_PROVIDER,
} from '../../../constants/authProvider.constants.js';
import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../constants/auditActions.constants.js';
import {
    AUTH_SESSION_REVOKED_REASON,
} from '../../../constants/authSession.constants.js';
import {
    USER_STATUS,
} from '../../../constants/userStatus.constants.js';
import {
    buildPasswordChangedEmail,
} from '../../../services/emailTemplates/passwordChangedEmail.js';
import {
    createAuditLog,
} from '../../auditLog/auditLog.service.js';
import {
    sendEmail,
} from '../../../services/email.service.js';
import { AppError } from '../../../utils/AppError.js';
import {
    hashPassword,
    verifyPassword,
} from '../../../utils/password.js';
import { hashToken } from '../../../utils/token.js';
import {
    AuthIdentity,
} from '../../authIdentities/authIdentity.model.js';
import {
    revokeAllUserAuthSessions,
} from '../../authSessions/authSession.service.js';
import {
    PasswordResetToken,
} from '../../passwordResetTokens/passwordResetToken.model.js';
import { User } from '../../users/user.model.js';

const INVALID_PASSWORD_RESET_TOKEN_MESSAGE =
    'Lien de réinitialisation invalide ou expiré';

/**
 * Réinitialise le mot de passe d'un utilisateur à partir
 * d'un token de récupération valide.
 *
 * Le token brut reçu du client n'est jamais recherché directement
 * en base : seul son hash SHA-256 est utilisé.
 *
 * Une première lecture hors transaction permet de vérifier
 * l'état courant du workflow et de calculer le nouveau hash Argon2id
 * avant d'ouvrir la transaction MongoDB.
 *
 * La transaction revalide ensuite atomiquement le token afin
 * qu'une même demande de réinitialisation ne puisse réussir
 * qu'une seule fois, même en cas de requêtes concurrentes.
 *
 * @param {object} input
 * @param {string} input.token Token brut préalablement validé.
 * @param {string} input.newPassword Nouveau mot de passe validé.
 * @param {string|null} [input.ipAddress]
 * @param {string|null} [input.userAgent]
 * returns {Promise<{passwordChangedAt: Date}>}
 */
const resetUserPassword = async ({
    token,
    newPassword,
    ipAddress = null,
    userAgent = null,
}) => {
    /*
     * Le token brut ne doit jamais être persisté.
     * PasswordResetToken.tokenHash contient uniquement son empreinte.
     */
    const tokenHash = hashToken(token);
    const now = new Date();

    /*
     * Cette première lecture évite d'ouvrir une transaction pour un
     * token manifestement inutilisable. La validation définitive sera
     * néanmoins effectuée atomiquement dans la transaction.
     */
    const passwordResetToken =
        await PasswordResetToken.findOne({
            tokenHash,
            usedAt: null,
            revokedAt: null,
            expiresAt: mongoose.trusted({
                $gt: now,
            }),
        });

    if (!passwordResetToken) {
        throw new AppError(
            INVALID_PASSWORD_RESET_TOKEN_MESSAGE,
            400,
        );
    }

    /*
     * User reste la source de vérité concernant l'existence
     * et l'état actuel du compte.
     */
    const user = await User.findById(
        passwordResetToken.user,
    );

    if (!user) {
        throw new AppError(
            INVALID_PASSWORD_RESET_TOKEN_MESSAGE,
            400,
        );
    }

    /*
     * Un compte clôturé est dans un état terminal. Un reset ne doit
     * pas restaurer indirectement sa capacité d'authentification.
     */
    if (user.status === USER_STATUS.CLOSED) {
        throw new AppError(
            INVALID_PASSWORD_RESET_TOKEN_MESSAGE,
            400,
        );
    }

    /*
     * Le mot de passe appartient à l'identité locale. passwordHash
     * étant select:false, il doit être demandé explicitement.
     */
    const authIdentity =
        await AuthIdentity.findOne({
            user: user._id,
            provider: AUTH_PROVIDER.LOCAL,
        }).select('+passwordHash');

    if (!authIdentity) {
        throw new AppError(
            INVALID_PASSWORD_RESET_TOKEN_MESSAGE,
            400,
        );
    }

    /*
     * Un nouveau salt produirait toujours un hash différent. Le mot
     * de passe brut doit donc être vérifié contre le hash actuel.
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
     * Le calcul Argon2id est effectué avant la transaction afin
     * d'en réduire la durée.
     */
    const newPasswordHash =
        await hashPassword(newPassword);

    const passwordChangedAt = new Date();

    await mongoose.connection.transaction(
        async (session) => {
            /*
             * Ce filtre constitue le verrou logique du workflow.
             * Deux requêtes concurrentes ne peuvent pas consommer
             * avec succès le même token.
             */
            const consumedPasswordResetToken =
                await PasswordResetToken.findOneAndUpdate(
                    {
                        _id: passwordResetToken._id,
                        tokenHash,
                        usedAt: null,
                        revokedAt: null,
                        expiresAt: mongoose.trusted({
                            $gt: passwordChangedAt,
                        }),
                    },
                    {
                        $set: {
                            usedAt: passwordChangedAt,
                        },
                    },
                    {
                        returnDocument: 'after',
                        session,
                    },
                );

            /*
             * Aucun document signifie que le token a expiré, a été
             * révoqué ou a été consommé depuis la première lecture.
             */
            if (!consumedPasswordResetToken) {
                throw new AppError(
                    INVALID_PASSWORD_RESET_TOKEN_MESSAGE,
                    400,
                );
            }

            /*
             * Le hash précédemment lu participe au filtre afin de ne
             * pas écraser un changement de mot de passe concurrent.
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
             * L'état du compte est revérifié dans la transaction.
             * CLOSED reste exclu même si le statut a changé depuis
             * la lecture préliminaire.
             */
            const userUpdateResult =
                await User.updateOne(
                    {
                        _id: user._id,
                        status: mongoose.trusted({
                            $in: [
                                USER_STATUS.ACTIVE,
                                USER_STATUS.DISABLED,
                                USER_STATUS.DELETION_REQUESTED,
                            ],
                        }),
                    },
                    {
                        $set: {
                            passwordChangedAt,
                            updatedBy: null,
                        },
                    },
                    {
                        session,
                    },
                );

            if (
                userUpdateResult.matchedCount !== 1
            ) {
                throw new AppError(
                    INVALID_PASSWORD_RESET_TOKEN_MESSAGE,
                    400,
                );
            }

            /*
             * Toutes les sessions existantes sont révoquées dans la
             * transaction afin d'invalider les anciens refresh tokens.
             */
            const revokedSessionsResult =
                await revokeAllUserAuthSessions({
                    userId: user._id,
                    revokedReason:
                        AUTH_SESSION_REVOKED_REASON
                            .PASSWORD_CHANGED,
                    session,
                });

            /*
* Le token autorise l'opération sans authentifier personnellement
* son détenteur. Le User est donc la cible, jamais l'acteur.
*/
            await createAuditLog(
                {
                    actor: null,
                    action:
                        AUDIT_ACTION
                            .PASSWORD_RESET_COMPLETED,
                    entityType:
                        AUDIT_ENTITY_TYPE.USER,
                    entityId: user._id,
                    status: AUDIT_STATUS.SUCCESS,
                    ipAddress,
                    userAgent,
                    metadata: {
                        provider: AUTH_PROVIDER.LOCAL,
                        revokedSessionCount:
                            revokedSessionsResult
                                .modifiedCount,
                    },
                },
                {
                    session,
                },
            );
        },
    );

    /*
     * La notification intervient après la transaction. Une panne SMTP
     * ne doit ni annuler le changement ni produire une réponse d'échec
     * alors que le nouveau mot de passe est déjà enregistré.
     */
    try {
        const {
            subject,
            text,
            html,
        } = buildPasswordChangedEmail();

        await sendEmail({
            to: user.email,
            subject,
            text,
            html,
        });
    } catch (error) {
        /*
         * Aucune adresse email, aucun token et aucun mot de passe
         * ne sont écrits dans les logs techniques.
         */
        console.error(
            'Password changed notification email failed',
            {
                userId: String(user._id),
                errorName: error?.name,
            },
        );
    }

    return {
        passwordChangedAt,
    };
};

export {
    resetUserPassword,
};