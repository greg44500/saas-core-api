import { CORE_PERMISSION } from './permissions.constants.js';


const SYSTEM_ROLE_KEY = Object.freeze({
    OWNER: 'owner',
    ADMIN: 'admin',
    MANAGER: 'manager',
    MEMBER: 'member',
    READER: 'reader',
});


/*
 * Les permissions d'administration ordinaires sont partagées par owner/admin.
 * Les permissions de gouvernance propres au propriétaire restent exclues ici
 * afin de ne pas être accordées automatiquement à un administrateur.
 */
const ADMINISTRATION_PERMISSIONS = Object.freeze(
    Object.values(CORE_PERMISSION).filter(
        (permission) =>
            permission
            !== CORE_PERMISSION.WORKSPACE_OWNERSHIP_TRANSFER,
    ),
);


const OWNER_PERMISSIONS = Object.freeze([
    ...ADMINISTRATION_PERMISSIONS,
    CORE_PERMISSION.WORKSPACE_OWNERSHIP_TRANSFER,
]);


// Manager et member sont encore proches, car le socle ne connaît
// volontairement aucune permission propre à une application métier.
const STANDARD_MEMBER_PERMISSIONS = Object.freeze([
    CORE_PERMISSION.WORKSPACE_READ,
    CORE_PERMISSION.MEMBER_READ,
    CORE_PERMISSION.ROLE_READ,
    CORE_PERMISSION.FILE_READ,
]);


const CORE_SYSTEM_ROLE_DEFINITIONS = Object.freeze([
    Object.freeze({
        key: SYSTEM_ROLE_KEY.OWNER,
        name: 'Propriétaire',
        description: 'Propriétaire du workspace avec un accès complet.',
        permissions: OWNER_PERMISSIONS,
        isSystem: true,
        isEditable: false,
    }),

    Object.freeze({
        key: SYSTEM_ROLE_KEY.ADMIN,
        name: 'Administrateur',
        description: 'Administre le workspace, ses membres et ses rôles.',
        permissions: ADMINISTRATION_PERMISSIONS,
        isSystem: true,
        isEditable: false,
    }),

    Object.freeze({
        key: SYSTEM_ROLE_KEY.MANAGER,
        name: 'Manager',
        description: 'Consulte le workspace, ses membres et ses rôles.',
        permissions: STANDARD_MEMBER_PERMISSIONS,
        isSystem: true,
        isEditable: false,
    }),

    Object.freeze({
        key: SYSTEM_ROLE_KEY.MEMBER,
        name: 'Membre',
        description: 'Accède aux informations générales du workspace.',
        permissions: STANDARD_MEMBER_PERMISSIONS,
        isSystem: true,
        isEditable: false,
    }),

    Object.freeze({
        key: SYSTEM_ROLE_KEY.READER,
        name: 'Lecteur',
        description: 'Dispose d’un accès en lecture au workspace.',
        permissions: Object.freeze([
            CORE_PERMISSION.WORKSPACE_READ,
            CORE_PERMISSION.FILE_READ,
        ]),
        isSystem: true,
        isEditable: false,
    }),
]);


/**
 * Construit les rôles système d'un nouveau workspace.
 *
 * Une application peut enrichir explicitement chaque rôle avec des permissions
 * qu'elle a enregistrées dans son registre RBAC. Le Core ne déduit jamais la
 * sémantique d'une permission applicative et ne décide donc pas seul à quels
 * rôles elle doit être accordée.
 */
const createSystemRoleDefinitions = ({
    permissionExtensionsByRole = {},
} = {}) => Object.freeze(
    CORE_SYSTEM_ROLE_DEFINITIONS.map((definition) => {
        const extensionPermissions =
            permissionExtensionsByRole[definition.key] ?? [];

        return Object.freeze({
            ...definition,
            permissions: Object.freeze([
                ...new Set([
                    ...definition.permissions,
                    ...extensionPermissions,
                ]),
            ]),
        });
    }),
);


/**
 * Définitions Core immuables des rôles créés automatiquement
 * dans chaque nouveau workspace.
 */
const SYSTEM_ROLE_DEFINITIONS = createSystemRoleDefinitions();


export {
    SYSTEM_ROLE_DEFINITIONS,
    SYSTEM_ROLE_KEY,
    createSystemRoleDefinitions,
};
