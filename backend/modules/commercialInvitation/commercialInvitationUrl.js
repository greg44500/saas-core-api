import { env } from '../../config/env.js';

/**
 * Le lien de sécurité est toujours construit depuis CLIENT_URL. L'hôte HTTP
 * reçu dans la requête n'est jamais réutilisé afin d'éviter l'empoisonnement
 * d'URL dans les emails transactionnels.
 */
const buildCommercialInvitationUrl = ({ token }) => {
    const invitationUrl = new URL(
        '/commercial-invitations/accept',
        env.CLIENT_URL,
    );

    invitationUrl.searchParams.set('token', token);

    return invitationUrl.toString();
};

export { buildCommercialInvitationUrl };
