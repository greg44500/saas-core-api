/**
 * Permissions transversales actuellement nécessaires au socle SaaS.
 *
 * Chaque permission représente une action précise dans un workspace.
 * Les futures applications métier pourront étendre ce registre avec leurs
 * propres permissions sans modifier celles du socle.
 */
const CORE_PERMISSION = Object.freeze({
    // Consultation et modification des informations courantes du workspace.
    WORKSPACE_READ: 'workspace:read',
    WORKSPACE_UPDATE: 'workspace:update',

    // Consultation et administration des appartenances au workspace.
    MEMBER_READ: 'member:read',
    MEMBER_INVITE: 'member:invite',
    MEMBER_UPDATE: 'member:update',
    MEMBER_SUSPEND: 'member:suspend',
    MEMBER_REMOVE: 'member:remove',

    // Consultation et administration des rôles du workspace.
    ROLE_READ: 'role:read',
    ROLE_CREATE: 'role:create',
    ROLE_UPDATE: 'role:update',
    ROLE_DELETE: 'role:delete',

    /*
     * Consultation de l'état contractuel opérationnel du workspace.
     *
     * Cette permission ne couvre volontairement ni les moyens de paiement,
     * ni l'identité de facturation, ni les identifiants du prestataire de
     * paiement. Ces données appartiendront au futur domaine Billing et seront
     * protégées par une règle propriétaire-only distincte.
     */
    SUBSCRIPTION_READ: 'subscription:read',

    /*
     * La lecture reste distincte de l'upload : perdre la capacité commerciale
     * de déposer de nouveaux contenus ne doit pas rendre inaccessibles les
     * fichiers actifs déjà détenus par le workspace.
     */
    FILE_READ: 'file:read',

    /*
     * Création d'une ressource File à partir d'un upload.
     *
     * Cette permission reste distincte de workspace:update : administrer les
     * paramètres du tenant et déposer un contenu sont deux actions différentes
     * qui doivent pouvoir évoluer indépendamment.
     */
    FILE_UPLOAD: 'file:upload',

    /*
     * La suppression est une action destructive distincte de la lecture et de
     * l'upload. Elle reste réservée aux rôles d'administration du workspace.
     */
    FILE_DELETE: 'file:delete',
});

export { CORE_PERMISSION };
