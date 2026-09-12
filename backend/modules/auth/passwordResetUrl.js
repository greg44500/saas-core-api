import { env } from '../../config/env.js';

/**
 * Construit l'URL frontend utilisée pour réinitialiser un mot de passe.
 *
 * Pourquoi cette fonction existe :
 * - l'URL ne doit jamais être construite à partir du Host reçu dans la requête ;
 * - CLIENT_URL constitue notre origine frontend explicitement configurée et validée ;
 * - l'utilisation de l'API URL de Node évite les concaténations fragiles de chaînes ;
 * - le token est placé dans le fragment afin qu'il ne soit pas envoyé au serveur
 *   lors de la navigation vers le frontend.
 *
 * Le token reçu ici est le token BRUT destiné à l'utilisateur.
 * Il ne doit jamais être persisté ou écrit dans les logs.
 *
 * @param {object} params
 * @param {string} params.token Token opaque brut de réinitialisation.
 *
 * @returns {string} URL complète à intégrer dans l'email.
 */
const buildPasswordResetUrl = ({ token }) => {
    const resetUrl = new URL('/reset-password', env.CLIENT_URL);

    // Le fragment n'est pas envoyé au serveur HTTP lors de la navigation.
    // URLSearchParams garantit également l'encodage correct du token.
    resetUrl.hash = new URLSearchParams({ token }).toString();

    return resetUrl.toString();
};

export { buildPasswordResetUrl };