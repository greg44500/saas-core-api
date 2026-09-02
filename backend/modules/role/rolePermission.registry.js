import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import { SYSTEM_ROLE_KEY } from '../../constants/role.constants.js';


const PERMISSION_PATTERN =
    /^[a-z][a-z0-9_-]*(?::[a-z][a-z0-9_-]*)+$/;


const normalizePermissionList = (permissions, label) => {
    if (!Array.isArray(permissions)) {
        throw new TypeError(`${label} must be an array`);
    }

    const normalizedPermissions = [
        ...new Set(
            permissions.map((permission) => {
                if (typeof permission !== 'string') {
                    throw new TypeError(
                        `${label} must contain only strings`,
                    );
                }

                const normalizedPermission =
                    permission.trim().toLowerCase();

                if (!PERMISSION_PATTERN.test(normalizedPermission)) {
                    throw new TypeError(
                        `Invalid permission in ${label}: ${permission}`,
                    );
                }

                return normalizedPermission;
            }),
        ),
    ];

    return Object.freeze(normalizedPermissions);
};


const normalizeSystemRolePermissions = ({
    systemRolePermissions,
    activePermissionSet,
}) => {
    if (
        systemRolePermissions === null
        || Array.isArray(systemRolePermissions)
        || typeof systemRolePermissions !== 'object'
    ) {
        throw new TypeError(
            'systemRolePermissions must be an object keyed by system role',
        );
    }

    const knownSystemRoleKeys = new Set(
        Object.values(SYSTEM_ROLE_KEY),
    );

    const normalizedEntries = Object.entries(systemRolePermissions)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([roleKey, permissions]) => {
            if (!knownSystemRoleKeys.has(roleKey)) {
                throw new TypeError(
                    `Unknown system role key: ${roleKey}`,
                );
            }

            const normalizedPermissions = normalizePermissionList(
                permissions,
                `systemRolePermissions.${roleKey}`,
            );

            const unknownPermission = normalizedPermissions.find(
                (permission) => !activePermissionSet.has(permission),
            );

            if (unknownPermission) {
                throw new TypeError(
                    `System role permission is not registered: ${unknownPermission}`,
                );
            }

            return [
                roleKey,
                normalizedPermissions,
            ];
        });

    return Object.freeze(
        Object.fromEntries(normalizedEntries),
    );
};


/**
 * Construit un registre RBAC immuable.
 *
 * Le Core fournit son registre par défaut. Une application consommatrice peut
 * construire son propre registre au démarrage en ajoutant ses permissions et
 * en déclarant explicitement les permissions applicatives accordées aux rôles
 * système. Cette configuration reste distincte des rôles personnalisés
 * persistés dans chaque workspace.
 */
const createRolePermissionRegistry = ({
    permissions = [],
    reservedPermissions = [],
    systemRolePermissions = {},
} = {}) => {
    const normalizedPermissions = normalizePermissionList(
        permissions,
        'permissions',
    );
    const activePermissionSet = new Set(normalizedPermissions);

    const normalizedReservedPermissions = normalizePermissionList(
        reservedPermissions,
        'reservedPermissions',
    );

    const unknownReservedPermission = normalizedReservedPermissions.find(
        (permission) => !activePermissionSet.has(permission),
    );

    if (unknownReservedPermission) {
        throw new TypeError(
            `Reserved permission is not registered: ${unknownReservedPermission}`,
        );
    }

    return Object.freeze({
        permissions: normalizedPermissions,
        reservedPermissions: normalizedReservedPermissions,
        systemRolePermissions: normalizeSystemRolePermissions({
            systemRolePermissions,
            activePermissionSet,
        }),
    });
};


const DEFAULT_ROLE_PERMISSION_REGISTRY = createRolePermissionRegistry({
    permissions: Object.values(CORE_PERMISSION),
    reservedPermissions: [
        CORE_PERMISSION.WORKSPACE_OWNERSHIP_TRANSFER,
    ],
});


let activeRolePermissionRegistry = DEFAULT_ROLE_PERMISSION_REGISTRY;


/**
 * Configure le registre actif avant le démarrage de l'application.
 *
 * La mutation porte uniquement sur la composition du runtime, jamais sur les
 * permissions persistées. Les services acceptent aussi une injection explicite
 * afin que les tests et migrations restent déterministes.
 */
const configureRolePermissionRegistry = (registry) => {
    if (
        !registry
        || !Array.isArray(registry.permissions)
        || !Array.isArray(registry.reservedPermissions)
        || !registry.systemRolePermissions
    ) {
        throw new TypeError('Invalid role permission registry');
    }

    activeRolePermissionRegistry = registry;

    return activeRolePermissionRegistry;
};


const getActiveRolePermissionRegistry = () =>
    activeRolePermissionRegistry;


/*
 * Compatibilité avec les imports historiques du Core.
 * Ces exports décrivent uniquement le registre Core par défaut ; le code
 * extensible doit préférer DEFAULT_ROLE_PERMISSION_REGISTRY ou le getter actif.
 */
const ACTIVE_ROLE_PERMISSIONS =
    DEFAULT_ROLE_PERMISSION_REGISTRY.permissions;

const RESERVED_CUSTOM_ROLE_PERMISSIONS =
    DEFAULT_ROLE_PERMISSION_REGISTRY.reservedPermissions;


export {
    ACTIVE_ROLE_PERMISSIONS,
    RESERVED_CUSTOM_ROLE_PERMISSIONS,
    DEFAULT_ROLE_PERMISSION_REGISTRY,
    configureRolePermissionRegistry,
    createRolePermissionRegistry,
    getActiveRolePermissionRegistry,
};
