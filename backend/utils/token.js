import { createHash, randomBytes } from 'node:crypto';

const REFRESH_TOKEN_BYTES = 32;

/**
 * Génère un refresh token opaque et cryptographiquement aléatoire.
 *
 * Le token brut est destiné au client et ne doit jamais être persisté
 * directement en base de données.
 *
 * @returns {string} Refresh token encodé en base64url.
 */
export const generateRefreshToken = () => {
    return randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
};

/**
 * Calcule l'empreinte SHA-256 d'un token opaque.
 *
 * Seule cette empreinte doit être stockée dans AuthSession.
 *
 * @param {string} token Token brut.
 * @returns {string} Hash SHA-256 encodé en hexadécimal.
 */
export const hashToken = (token) => {
    return createHash('sha256').update(token).digest('hex');
};