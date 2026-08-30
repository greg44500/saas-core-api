/**
 * États possibles d'une invitation à rejoindre un workspace.
 *
 * Une invitation reste distincte d'un WorkspaceMember : tant qu'elle n'est
 * pas acceptée, elle ne confère aucun droit d'accès au tenant.
 */
const WORKSPACE_INVITATION_STATUS = Object.freeze({
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REVOKED: 'revoked',
    EXPIRED: 'expired',
});

/**
 * Durée de validité métier d'une invitation.
 *
 * La valeur est centralisée afin que le service, les tests et les futurs
 * transports email utilisent la même règle sans dupliquer un nombre magique.
 */
const WORKSPACE_INVITATION_TTL_DAYS = 7;

/**
 * Taille du secret aléatoire remis au destinataire.
 *
 * Seul le hash SHA-256 de ce secret sera persisté en base.
 */
const WORKSPACE_INVITATION_TOKEN_BYTES = 32;

export {
    WORKSPACE_INVITATION_STATUS,
    WORKSPACE_INVITATION_TOKEN_BYTES,
    WORKSPACE_INVITATION_TTL_DAYS,
};
