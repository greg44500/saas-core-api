import { randomUUID } from 'node:crypto';

import { env } from '../../config/env.js';
import { addDays } from '../../utils/date.js';
import {
    generateRefreshToken,
    hashToken,
} from '../../utils/token.js';
import { AuthSession } from './authSession.model.js';

/**
 * Crée la première AuthSession d'une nouvelle connexion authentifiée.
 *
 * Cette fonction est utilisée après validation complète des credentials
 * et de l'état du User.
 *
 * Elle génère :
 * - un refresh token opaque ;
 * - son hash destiné à MongoDB ;
 * - une nouvelle famille de rotation ;
 * - la date d'expiration de la session.
 *
 * Le refresh token brut est retourné uniquement afin que la couche HTTP
 * puisse ensuite l'envoyer au client dans un cookie HttpOnly.
 *
 * @param {Object} params
 * @param {string|import('mongoose').Types.ObjectId} params.userId
 * @param {string|null} [params.userAgent]
 * @param {string|null} [params.ipAddress]
 * @returns {Promise<{
 *   authSession: import('mongoose').Document,
 *   refreshToken: string
 * }>}
 */
export const createInitialAuthSession = async ({
    userId,
    userAgent = null,
    ipAddress = null,
}) => {
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshToken);

    const familyId = randomUUID();

    const expiresAt = addDays(
        new Date(),
        env.REFRESH_TOKEN_EXPIRES_IN_DAYS
    );

    const authSession = await AuthSession.create({
        user: userId,
        refreshTokenHash,
        familyId,
        expiresAt,
        userAgent,
        ipAddress,
    });

    return {
        authSession,
        refreshToken,
    };
};