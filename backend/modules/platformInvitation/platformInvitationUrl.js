import { env } from '../../config/env.js';


/**
 * Construit le lien frontend depuis CLIENT_URL uniquement.
 * L'hôte HTTP fourni par le client ne doit jamais être réinjecté dans un email
 * de sécurité.
 *
 * Le secret reste dans le fragment afin qu'il ne soit jamais transmis au
 * serveur HTTP lors du chargement initial du frontend.
 */
const buildPlatformInvitationUrl = ({ token }) => {
    const invitationUrl = new URL(
        '/platform-invitations/accept',
        env.CLIENT_URL,
    );

    invitationUrl.hash = new URLSearchParams({ token }).toString();

    return invitationUrl.toString();
};


export { buildPlatformInvitationUrl };
