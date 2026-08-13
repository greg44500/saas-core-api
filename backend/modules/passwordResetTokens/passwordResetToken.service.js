import mongoose from 'mongoose';

import { env } from '../../config/env.js';
import { addMinutes } from '../../utils/date.js';
import {
    generatePasswordResetToken,
    hashToken,
} from '../../utils/token.js';
import {
    PasswordResetToken,
} from './passwordResetToken.model.js';


/**
 * Crée une demande de réinitialisation du mot de passe.
 *
 * Les demandes encore actives du même utilisateur sont révoquées
 * avant la création du nouveau token, dans une transaction MongoDB.
 *
 * Le token brut existe uniquement en mémoire. Seul son hash SHA-256
 * est conservé dans PasswordResetToken.
 *
 * @param {object} input
 * @param {string|import('mongoose').Types.ObjectId} input.userId
 * @param {string|null} [input.ipAddress]
 * @param {string|null} [input.userAgent]
 * @returns {Promise<{
 *   passwordResetToken: import('mongoose').Document,
 *   resetToken: string
 * }>}
 */
const createPasswordResetToken = async ({
    userId,
    ipAddress = null,
    userAgent = null,
}) => {
    if (!userId) {
        throw new TypeError(
            'userId is required to create a password reset token',
        );
    }

    const resetToken =
        generatePasswordResetToken();

    const tokenHash =
        hashToken(resetToken);

    const now = new Date();

    const expiresAt = addMinutes(
        now,
        env.PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES,
    );

    let createdPasswordResetToken;

    await mongoose.connection.transaction(
        async (session) => {
            /*
             * Une nouvelle demande invalide les précédentes demandes
             * encore utilisables du même utilisateur.
             */
            await PasswordResetToken.updateMany(
                {
                    user: userId,
                    usedAt: null,
                    revokedAt: null,
                    expiresAt: mongoose.trusted({
                        $gt: now,
                    }),
                },
                {
                    $set: {
                        revokedAt: now,
                    },
                },
                {
                    session,
                },
            );

            const [passwordResetToken] =
                await PasswordResetToken.create(
                    [
                        {
                            user: userId,
                            tokenHash,
                            expiresAt,
                            ipAddress,
                            userAgent,
                        },
                    ],
                    {
                        session,
                    },
                );

            createdPasswordResetToken =
                passwordResetToken;
        },
    );

    return {
        passwordResetToken:
            createdPasswordResetToken,
        resetToken,
    };
};


export {
    createPasswordResetToken,
};