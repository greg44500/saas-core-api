/**
 * États administratifs possibles d'un plan commercial.
 *
 * Le statut décrit si le plan peut encore être utilisé par la plateforme.
 * Il est distinct de `isPublic`, qui indique uniquement si le plan doit être
 * visible dans le catalogue commercial présenté aux utilisateurs.
 */
const PLAN_STATUS = Object.freeze({
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    ARCHIVED: 'archived',
});

/**
 * Rôles structurels réservés au système.
 *
 * Le rôle `baseline` identifie l'offre de référence automatiquement attachée
 * à chaque nouveau workspace. Il ne dépend ni du nom commercial du plan, ni
 * d'une clé saisie par un administrateur.
 */
const PLAN_SYSTEM_ROLE = Object.freeze({
    BASELINE: 'baseline',
});

/**
 * Clés historiques conservées uniquement pour compatibilité avec les données
 * et migrations antérieures. Les nouveaux plans créés depuis Platform reçoivent
 * désormais une clé technique générée par le backend.
 */
const PLAN_KEY = Object.freeze({
    FREE: 'free',
    STARTER: 'starter',
    PREMIUM: 'premium',
    BUSINESS: 'business',
    ENTERPRISE: 'enterprise',
});

export {
    PLAN_KEY,
    PLAN_STATUS,
    PLAN_SYSTEM_ROLE,
};
