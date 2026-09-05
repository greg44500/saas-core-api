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
 * Compose les déclarations RBAC des modules réellement embarqués.
 *
 * Un descriptor reste volontairement petit : il déclare ses permissions,
 * celles qui sont réservées aux rôles système et les rôles système qui doivent
 * recevoir ses permissions. Il n'existe aucune découverte automatique de
 * modules afin que la composition reste explicite et déterministe.
 */
const composeRolePermissionExtensions = (modules = []) => {
    if (!Array.isArray(modules)) {
        throw new TypeError('modules must be an array');
    }

    const permissions = [];
    const reservedPermissions = [];
    const systemRolePermissions = {};
    const declaredPermissions = new Set();

    modules.forEach((moduleDefinition, moduleIndex) => {
        if (
            moduleDefinition === null
            || Array.isArray(moduleDefinition)
            || typeof moduleDefinition !== 'object'
        ) {
            throw new TypeError(
                `RBAC module at index ${moduleIndex} must be an object`,
            );
        }

        const modulePermissions = normalizePermissionList(
            moduleDefinition.permissions ?? [],
            `modules[${moduleIndex}].permissions`,
        );
        const modulePermissionSet = new Set(modulePermissions);

        for (const permission of modulePermissions) {
            if (declaredPermissions.has(permission)) {
                throw new TypeError(
                    `Duplicate application permission declaration: ${permission}`,
                );
            }

            declaredPermissions.add(permission);
            permissions.push(permission);
        }

        const moduleReservedPermissions = normalizePermissionList(
            moduleDefinition.reservedPermissions ?? [],
            `modules[${moduleIndex}].reservedPermissions`,
        );

        for (const permission of moduleReservedPermissions) {
            if (!modulePermissionSet.has(permission)) {
                throw new TypeError(
                    `Reserved application permission is not declared by its module: ${permission}`,
                );
            }

            reservedPermissions.push(permission);
        }

        const moduleSystemRolePermissions =
            moduleDefinition.systemRolePermissions ?? {};

        if (
            moduleSystemRolePermissions === null
            || Array.isArray(moduleSystemRolePermissions)
            || typeof moduleSystemRolePermissions !== 'object'
        ) {
            throw new TypeError(
                `modules[${moduleIndex}].systemRolePermissions must be an object`,
            );
        }

        for (const [roleKey, rolePermissions] of Object.entries(
            moduleSystemRolePermissions,
        )) {
            if (!Object.values(SYSTEM_ROLE_KEY).includes(roleKey)) {
                throw new TypeError(
                    `Unknown system role key: ${roleKey}`,
                );
            }

            const normalizedRolePermissions = normalizePermissionList(
                rolePermissions,
                `modules[${moduleIndex}].systemRolePermissions.${roleKey}`,
            );

            const foreignPermission = normalizedRolePermissions.find(
                (permission) => !modulePermissionSet.has(permission),
            );

            if (foreignPermission) {
                throw new TypeError(
                    `System role permission is not declared by its module: ${foreignPermission}`,
                );
            }

            systemRolePermissions[roleKey] = [
                ...new Set([
                    ...(systemRolePermissions[roleKey] ?? []),
                    ...normalizedRolePermissions,
                ]),
            ];
        }
    });

    return Object.freeze({
        permissions: Object.freeze(permissions),
        reservedPermissions: Object.freeze([
            ...new Set(reservedPermissions),
        ]),
        systemRolePermissions: Object.freeze(
            Object.fromEntries(
                Object.entries(systemRolePermissions)
                    .sort(([leftKey], [rightKey]) =>
                        leftKey.localeCompare(rightKey))
                    .map(([roleKey, rolePermissions]) => [
                        roleKey,
                        Object.freeze(rolePermissions),
                    ]),
            ),
        ),
    });
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
    composeRolePermissionExtensions,
    configureRolePermissionRegistry,
    createRolePermissionRegistry,
    getActiveRolePermissionRegistry,
};
