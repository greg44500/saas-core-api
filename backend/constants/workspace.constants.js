/**
 * États administratifs possibles d’un workspace.
 *
 * Ils contrôlent la disponibilité globale du workspace et priment sur les
 * rôles et permissions de ses membres.
 *
 * La facturation et les accès gratuits restent gérés séparément par
 * Subscription.
 */
const WORKSPACE_STATUS = Object.freeze({
    /**
     * Le workspace fonctionne normalement.
     *
     * Les membres peuvent l’utiliser selon leur membership, leur rôle,
     * leurs permissions et les limites de l’abonnement.
     */
    ACTIVE: 'active',

    /**
     * Blocage administratif temporaire décidé par la plateforme.
     *
     * Les données sont conservées. Le workspace pourra être réactivé
     * lorsque la cause de la suspension aura été résolue.
     *
     * Un owner ou un administrateur du workspace ne peut pas contourner
     * cet état.
     */
    SUSPENDED: 'suspended',

    /**
     * Retrait volontaire et réversible du workspace de l’usage courant.
     *
     * Cet état sera déclenché par un membre disposant de la permission
     * nécessaire. Il ne représente ni un impayé ni une sanction plateforme.
     */
    ARCHIVED: 'archived',

    /**
     * Fermeture fonctionnelle définitive du workspace.
     *
     * Le workspace n’est plus exploitable. Ses données restent conservées
     * selon la future politique de rétention et ne sont pas automatiquement
     * supprimées de la base de données.
     *
     * Cet état ne pourra être appliqué que par la plateforme.
     */
    CLOSED: 'closed',
});


/**
 * Motifs administratifs encadrant une suspension ou une fermeture.
 *
 * Ils fournissent une information structurée exploitable par les services,
 * les outils d’administration et les journaux d’audit.
 *
 * Les règles de service détermineront quels motifs sont acceptables pour
 * chaque changement de statut.
 */
const WORKSPACE_STATUS_REASON = Object.freeze({
    /** Échecs de paiement persistants après le futur délai de grâce. */
    PAYMENT_FAILURE: 'payment_failure',

    /** Contestation, rétrofacturation ou autre litige lié à un paiement. */
    PAYMENT_DISPUTE: 'payment_dispute',

    /** Non-respect présumé ou confirmé des conditions d’utilisation. */
    TERMS_VIOLATION: 'terms_violation',

    /** Blocage préventif lié à un risque ou à un incident de sécurité. */
    SECURITY_INCIDENT: 'security_incident',

    /** Vérification temporaire menée par l’administration de la plateforme. */
    ADMINISTRATIVE_REVIEW: 'administrative_review',

    /** Archivage ou fermeture demandé par les responsables du workspace. */
    OWNER_REQUEST: 'owner_request',

    /** Décision exceptionnelle relevant de la gouvernance de la plateforme. */
    PLATFORM_DECISION: 'platform_decision',

    /**
     * Motif ne correspondant à aucune autre valeur.
     *
     * Son utilisation devra être accompagnée d’une justification textuelle
     * dans le service et dans le journal d’audit.
     */
    OTHER: 'other',
});


/**
 * Transitions de statut autorisées.
 *
 * Cette table servira au service Workspace pour empêcher les changements
 * incohérents ou les réouvertures accidentelles.
 *
 * CLOSED est volontairement terminal : aucune transition ordinaire n’est
 * autorisée après une fermeture définitive.
 */
const WORKSPACE_STATUS_TRANSITIONS = Object.freeze({
    [WORKSPACE_STATUS.ACTIVE]: Object.freeze([
        WORKSPACE_STATUS.SUSPENDED,
        WORKSPACE_STATUS.ARCHIVED,
        WORKSPACE_STATUS.CLOSED,
    ]),

    [WORKSPACE_STATUS.SUSPENDED]: Object.freeze([
        WORKSPACE_STATUS.ACTIVE,
        WORKSPACE_STATUS.ARCHIVED,
        WORKSPACE_STATUS.CLOSED,
    ]),

    [WORKSPACE_STATUS.ARCHIVED]: Object.freeze([
        WORKSPACE_STATUS.ACTIVE,
        WORKSPACE_STATUS.CLOSED,
    ]),

    [WORKSPACE_STATUS.CLOSED]: Object.freeze([]),
});


export {
    WORKSPACE_STATUS,
    WORKSPACE_STATUS_REASON,
    WORKSPACE_STATUS_TRANSITIONS,
};