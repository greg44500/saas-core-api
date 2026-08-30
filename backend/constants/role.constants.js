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


/**
 * Définitions immuables des rôles créés automatiquement
 * dans chaque nouveau workspace.
 */
const SYSTEM_ROLE_DEFINITIONS = Object.freeze([
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


export {
    SYSTEM_ROLE_DEFINITIONS,
    SYSTEM_ROLE_KEY,
};
