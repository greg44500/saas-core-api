import { env } from '../../config/env.js';

/**
 * Construit le lien frontend d'acceptation depuis l'origine configurée.
 * Le Host de la requête HTTP n'est jamais utilisé pour éviter qu'une entrée
 * contrôlée par le client ne se retrouve dans un email de sécurité.
 */
const buildWorkspaceInvitationUrl = ({ token }) => {
    const invitationUrl = new URL('/invitations/accept', env.CLIENT_URL);
    invitationUrl.searchParams.set('token', token);
    return invitationUrl.toString();
};

export { buildWorkspaceInvitationUrl };
