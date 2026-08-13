import { env } from '../../config/env.js';

/**
 * Construit l'URL frontend utilisée pour réinitialiser un mot de passe.
 *
 * Pourquoi cette fonction existe :
 * - l'URL ne doit jamais être construite à partir du Host reçu dans la requête ;
 * - CLIENT_URL constitue notre origine frontend explicitement configurée et validée ;
 * - l'utilisation de l'API URL de Node évite les concaténations fragiles de chaînes ;
 * - URLSearchParams encode correctement le token lorsqu'il est placé dans la query string.
 *
 * Le token reçu ici est le token BRUT destiné à l'utilisateur.
 * Il ne doit jamais être persisté ou écrit dans les logs.
 *
 * @param {Object} params
 * @param {string} params.token Token opaque brut de réinitialisation.
 *
 * @returns {string} URL complète à intégrer dans l'email.
 */
const buildPasswordResetUrl = ({ token }) => {
    const resetUrl = new URL('/reset-password', env.CLIENT_URL);

    // Le token est ajouté via URLSearchParams plutôt que par concaténation.
    // Cela garantit son encodage correct dans l'URL.
    resetUrl.searchParams.set('token', token);

    return resetUrl.toString();
};

export { buildPasswordResetUrl };