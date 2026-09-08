import { env } from '../../config/env.js';

/**
 * Le lien de sécurité est toujours construit depuis CLIENT_URL. L'hôte HTTP
 * reçu dans la requête n'est jamais réutilisé afin d'éviter l'empoisonnement
 * d'URL dans les emails transactionnels.
 *
 * Le secret est placé dans le fragment plutôt que dans la query string : le
 * navigateur ne transmet pas ce fragment au serveur HTTP. Le frontend doit le
 * lire, le conserver uniquement en mémoire le temps du parcours puis nettoyer
 * l'URL avec history.replaceState.
 */
const buildCommercialInvitationUrl = ({ token }) => {
    const invitationUrl = new URL(
        '/commercial-invitations/accept',
        env.CLIENT_URL,
    );

    invitationUrl.hash = new URLSearchParams({ token }).toString();

    return invitationUrl.toString();
};

export { buildCommercialInvitationUrl };
