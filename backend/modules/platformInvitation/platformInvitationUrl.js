import { env } from '../../config/env.js';


/**
 * Construit le lien frontend depuis CLIENT_URL uniquement.
 * L'hôte HTTP fourni par le client ne doit jamais être réinjecté dans un email
 * de sécurité.
 */
const buildPlatformInvitationUrl = ({ token }) => {
    const invitationUrl = new URL(
        '/platform-invitations/accept',
        env.CLIENT_URL,
    );

    invitationUrl.searchParams.set('token', token);

    return invitationUrl.toString();
};


export { buildPlatformInvitationUrl };
