import {
    createHash,
    randomBytes,
} from 'node:crypto';


const OPAQUE_TOKEN_BYTES = 32;


/**
 * Génère un token opaque cryptographiquement aléatoire.
 *
 * Cette primitive reste interne afin que chaque usage public
 * conserve un nom correspondant à sa responsabilité métier.
 *
 * @returns {string} Token encodé en base64url.
 */
const generateOpaqueToken = () => {
    return randomBytes(
        OPAQUE_TOKEN_BYTES,
    ).toString('base64url');
};


/**
 * Génère un refresh token opaque.
 *
 * Le token brut est destiné au client et ne doit jamais
 * être persisté directement en base de données.
 *
 * @returns {string} Refresh token encodé en base64url.
 */
export const generateRefreshToken = () => {
    return generateOpaqueToken();
};


/**
 * Génère un token opaque de réinitialisation du mot de passe.
 *
 * Le token brut sera transmis à l'utilisateur par le canal
 * de récupération, mais seul son hash sera persisté.
 *
 * @returns {string} Token encodé en base64url.
 */
export const generatePasswordResetToken = () => {
    return generateOpaqueToken();
};


/**
 * Calcule l'empreinte SHA-256 d'un token opaque.
 *
 * Seule cette empreinte doit être persistée.
 *
 * @param {string} token Token brut.
 * @returns {string} Hash SHA-256 encodé en hexadécimal.
 */
export const hashToken = (token) => {
    return createHash('sha256')
        .update(token)
        .digest('hex');
};