import { env } from '../../config/env.js';

/**
 * Construit le lien frontend d'acceptation depuis l'origine configurée.
 * Le Host de la requête HTTP n'est jamais utilisé pour éviter qu'une entrée
 * contrôlée par le client ne se retrouve dans un email de sécurité.
 *
 * Le secret reste dans le fragment afin qu'il ne soit jamais transmis au
 * serveur HTTP lors du chargement initial du frontend.
 */
const buildWorkspaceInvitationUrl = ({ token }) => {
    const invitationUrl = new URL('/invitations/accept', env.CLIENT_URL);
    invitationUrl.hash = new URLSearchParams({ token }).toString();
    return invitationUrl.toString();
};

export { buildWorkspaceInvitationUrl };
