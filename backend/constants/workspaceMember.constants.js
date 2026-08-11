/**
 * États possibles de l’appartenance d’un utilisateur à un workspace.
 *
 * Ces états concernent uniquement l’accès au workspace. Ils ne remplacent pas
 * le statut global du User ni le statut administratif du Workspace.
 *
 * Une invitation n’est pas encore une appartenance : elle sera gérée
 * séparément par le futur modèle Invitation.
 */
const WORKSPACE_MEMBER_STATUS = Object.freeze({
    /**
     * Appartenance actuellement valide.
     *
     * L’utilisateur peut accéder au workspace selon le rôle et les permissions
     * associés à son WorkspaceMember.
     */
    ACTIVE: 'active',

    /**
     * Appartenance temporairement désactivée.
     *
     * L’utilisateur reste rattaché au workspace, mais son accès est bloqué.
     * Cet état est réversible et ne modifie ni son compte global ni les autres
     * workspaces auxquels il appartient.
     */
    SUSPENDED: 'suspended',

    /**
     * Appartenance terminée.
     *
     * L’utilisateur n’a plus accès au workspace, mais le document est conservé
     * pour préserver l’historique, les références et la traçabilité.
     *
     * Une éventuelle réintégration devra suivre un processus explicite défini
     * ultérieurement, notamment pour ne pas contourner le cycle d’invitation.
     */
    REMOVED: 'removed',
});


export { WORKSPACE_MEMBER_STATUS };