/**
 * Clés stables des rôles système disponibles dans chaque workspace.
 *
 * Ces clés sont utilisées par le backend pour reconnaître les rôles protégés.
 * Les noms affichés pourront évoluer sans modifier les règles métier.
 */
const SYSTEM_ROLE_KEY = Object.freeze({
    /**
     * Rôle responsable du workspace.
     *
     * Au moins un membre actif doit conserver ce rôle.
     * Il ne pourra être ni supprimé ni rendu librement modifiable.
     */
    OWNER: 'owner',

    /**
     * Rôle d’administration courante du workspace.
     *
     * Il dispose de droits étendus sans posséder les protections particulières
     * attachées au rôle owner.
     */
    ADMIN: 'admin',

    /**
     * Rôle intermédiaire destiné au pilotage opérationnel.
     */
    MANAGER: 'manager',

    /**
     * Rôle standard permettant d’utiliser les fonctionnalités du workspace
     * selon les permissions qui lui seront attribuées.
     */
    MEMBER: 'member',

    /**
     * Rôle principalement destiné à la consultation des données.
     */
    READER: 'reader',
});


export { SYSTEM_ROLE_KEY };