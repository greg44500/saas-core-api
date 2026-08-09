import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';


// L'algorithme accepté est une décision de sécurité du code.
// Il n'est volontairement pas configurable depuis l'environnement.
const JWT_ACCESS_ALGORITHM = 'HS256';


/**
 * Génère un access token pour un utilisateur authentifié.
 *
 * Le payload reste volontairement minimal :
 * `sub` identifie le User auquel appartient le token.
 *
 * @param {string} userId - Identifiant MongoDB du User.
 * @returns {string} Access token JWT signé.
 */
export const signAccessToken = (userId) => {
    return jwt.sign(
        {},
        env.JWT_ACCESS_SECRET,
        {
            algorithm: JWT_ACCESS_ALGORITHM,
            subject: userId,
            expiresIn: env.JWT_ACCESS_EXPIRES_IN,
            issuer: env.JWT_ACCESS_ISSUER,
            audience: env.JWT_ACCESS_AUDIENCE,
        },
    );
};


/**
 * Vérifie et décode un access token.
 *
 * La vérification impose explicitement :
 * - l'algorithme attendu ;
 * - l'issuer attendu ;
 * - l'audience attendue ;
 * - la validité temporelle du token.
 *
 * Une erreur est levée si le token n'est pas valide.
 *
 * @param {string} token - Access token JWT reçu du client.
 * @returns {object} Payload JWT vérifié.
 */
export const verifyAccessToken = (token) => {
    return jwt.verify(
        token,
        env.JWT_ACCESS_SECRET,
        {
            algorithms: [JWT_ACCESS_ALGORITHM],
            issuer: env.JWT_ACCESS_ISSUER,
            audience: env.JWT_ACCESS_AUDIENCE,
        },
    );
};