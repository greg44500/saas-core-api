import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';


// L'algorithme accepté est une décision de sécurité du code.
// Il n'est volontairement pas configurable depuis l'environnement.
const JWT_ACCESS_ALGORITHM = 'HS256';


/**
 * Génère un access token pour un utilisateur authentifié.
 *
 * Le payload reste minimal :
 * - sub identifie le User ;
 * - passwordChangedAt identifie la version actuelle
 *   de ses informations d'authentification.
 *
 * Cette date permet d'invalider immédiatement les access tokens
 * émis avant un changement de mot de passe.
 *
 * @param {string} userId Identifiant MongoDB du User.
 * @param {Date|null} [passwordChangedAt=null]
 * Date du dernier changement de mot de passe.
 * @returns {string} Access token JWT signé.
 */
export const signAccessToken = (
    userId,
    passwordChangedAt = null,
) => {
    if (
        passwordChangedAt !== null
        && (
            !(passwordChangedAt instanceof Date)
            || Number.isNaN(
                passwordChangedAt.getTime(),
            )
        )
    ) {
        throw new TypeError(
            'passwordChangedAt must be a valid Date or null',
        );
    }

    /*
     * Les utilisateurs n'ayant jamais modifié leur mot de passe
     * ne reçoivent pas de propriété passwordChangedAt dans le token.
     */
    const payload = {};

    if (passwordChangedAt) {
        payload.passwordChangedAt =
            passwordChangedAt.getTime();
    }

    return jwt.sign(
        payload,
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
 * La cohérence entre payload.passwordChangedAt et le User
 * actuellement enregistré est contrôlée par authenticate.
 *
 * @param {string} token Access token JWT reçu du client.
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