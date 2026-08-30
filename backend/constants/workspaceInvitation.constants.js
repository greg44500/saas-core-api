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
 * État du transport de l'invitation.
 *
 * Le transport est volontairement séparé du statut métier : une invitation
 * peut rester pending même si son email n'a pas pu être délivré.
 */
const WORKSPACE_INVITATION_DELIVERY_STATUS = Object.freeze({
    PENDING: 'pending',
    SENT: 'sent',
    FAILED: 'failed',
});

/**
 * Durée de validité métier d'une invitation.
 */
const WORKSPACE_INVITATION_TTL_DAYS = 7;

/**
 * Taille du secret aléatoire remis au destinataire.
 * Seul le hash SHA-256 de ce secret est persisté.
 */
const WORKSPACE_INVITATION_TOKEN_BYTES = 32;

export {
    WORKSPACE_INVITATION_DELIVERY_STATUS,
    WORKSPACE_INVITATION_STATUS,
    WORKSPACE_INVITATION_TOKEN_BYTES,
    WORKSPACE_INVITATION_TTL_DAYS,
};
