/**
 * Extrait le token opaque de réinitialisation depuis le fragment de l'URL.
 *
 * Le fragment est utilisé pour éviter d'envoyer le secret au serveur lors de
 * la requête HTTP initiale vers le frontend.
 *
 * Cette fonction reste volontairement pure afin que la lecture du secret et
 * le nettoyage de l'URL restent deux responsabilités distinctes.
 *
 * @param {string} hash Fragment courant de l'URL.
 * @returns {string|null}
 */
function getPasswordResetTokenFromHash(hash) {
    const fragment = hash.startsWith('#') ? hash.slice(1) : hash;
    const token = new URLSearchParams(fragment).get('token');

    if (!token || token.length > 256) {
        return null;
    }

    return token;
}

export { getPasswordResetTokenFromHash };