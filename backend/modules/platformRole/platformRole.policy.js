import {
    ACTIVE_PLATFORM_PERMISSION_REGISTRY,
} from '../../config/applicationPlatformPermission.registry.js';
import {
    PLATFORM_PERMISSION_SENSITIVITY,
} from '../../constants/platformPermissions.constants.js';
import {
    PLATFORM_ROLE_STATUS,
    PLATFORM_TEAM_ROLE_KEY,
} from '../../constants/platformTeam.constants.js';
import { AppError } from '../../utils/appError.js';
import {
    getPlatformRoleEffectivePermissions,
} from '../platformTeam/platformAuthorization.service.js';


const PLATFORM_PERMISSION_DEFINITIONS_BY_KEY = new Map(
    ACTIVE_PLATFORM_PERMISSION_REGISTRY.definitions.map(
        (definition) => [definition.key, definition],
    ),
);

const RESERVED_PLATFORM_PERMISSION_KEYS = new Set(
    ACTIVE_PLATFORM_PERMISSION_REGISTRY.definitions
        .filter(
            ({ sensitivity }) =>
                sensitivity === PLATFORM_PERMISSION_SENSITIVITY.RESERVED,
        )
        .map(({ key }) => key),
);

const isSuperAdminAuthorization = (authorization) =>
    authorization?.roleKey === PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN;

const isStrictPermissionSubset = ({
    candidatePermissions,
    actorPermissions,
}) => {
    const candidateSet = new Set(candidatePermissions);
    const actorSet = new Set(actorPermissions);

    return candidateSet.size < actorSet.size
        && [...candidateSet].every(
            (permission) => actorSet.has(permission),
        );
};

/**
 * Les rôles personnalisés ne peuvent utiliser que le registre actif. Une
 * permission RESERVED reste interdite même au Super administrateur : ces
 * pouvoirs appartiennent aux rôles système protégés, jamais aux rôles créés
 * depuis l'administration courante.
 */
const assertCustomPlatformRolePermissions = ({
    authorization,
    permissions,
}) => {
    if (!authorization || !Array.isArray(authorization.permissions)) {
        throw new TypeError(
            'authorization is required to validate Platform role permissions',
        );
    }

    if (!Array.isArray(permissions)) {
        throw new TypeError(
            'permissions must be an array to validate a custom Platform role',
        );
    }

    const uniquePermissions = [...new Set(permissions)];

    for (const permission of uniquePermissions) {
        if (!PLATFORM_PERMISSION_DEFINITIONS_BY_KEY.has(permission)) {
            throw new AppError(
                'Une permission sélectionnée n’existe pas dans le registre Platform actif.',
                400,
            );
        }

        if (RESERVED_PLATFORM_PERMISSION_KEYS.has(permission)) {
            throw new AppError(
                'Une permission réservée ne peut pas être attribuée à un rôle personnalisé.',
                403,
            );
        }
    }

    if (isSuperAdminAuthorization(authorization)) {
        return Object.freeze(uniquePermissions);
    }

    if (!isStrictPermissionSubset({
        candidatePermissions: uniquePermissions,
        actorPermissions: authorization.permissions,
    })) {
        throw new AppError(
            'Vous ne pouvez créer ou modifier qu’un rôle disposant de droits strictement inférieurs aux vôtres.',
            403,
        );
    }

    return Object.freeze(uniquePermissions);
};

const assertCustomPlatformRoleIsMutable = ({
    authorization,
    role,
}) => {
    if (!role) {
        throw new TypeError(
            'role is required to validate Platform role mutability',
        );
    }

    if (role.isSystem === true) {
        throw new AppError(
            'Un rôle système de la Plateforme ne peut pas être modifié depuis l’administration courante.',
            409,
        );
    }

    if (role.status !== PLATFORM_ROLE_STATUS.ACTIVE) {
        throw new AppError(
            'Un rôle Platform archivé ne peut plus être modifié.',
            409,
        );
    }

    const currentPermissions = getPlatformRoleEffectivePermissions(role);

    if (isSuperAdminAuthorization(authorization)) {
        return Object.freeze([...currentPermissions]);
    }

    if (!isStrictPermissionSubset({
        candidatePermissions: currentPermissions,
        actorPermissions: authorization?.permissions ?? [],
    })) {
        throw new AppError(
            'Vous ne pouvez gérer qu’un rôle disposant de droits strictement inférieurs aux vôtres.',
            403,
        );
    }

    return Object.freeze([...currentPermissions]);
};

/**
 * Le catalogue reste entièrement code-owned. `assignable` informe seulement
 * l'interface ; les mutations revalident toujours la règle côté service.
 */
const getPlatformRolePermissionCatalog = ({ authorization }) => {
    if (!authorization || !Array.isArray(authorization.permissions)) {
        throw new TypeError(
            'authorization is required to build the Platform permission catalog',
        );
    }

    const actorPermissions = new Set(authorization.permissions);
    const isSuperAdmin = isSuperAdminAuthorization(authorization);

    return ACTIVE_PLATFORM_PERMISSION_REGISTRY.definitions.map(
        (definition) => ({
            ...definition,
            assignable:
                definition.sensitivity
                    !== PLATFORM_PERMISSION_SENSITIVITY.RESERVED
                && (
                    isSuperAdmin
                    || actorPermissions.has(definition.key)
                ),
        }),
    );
};


export {
    assertCustomPlatformRoleIsMutable,
    assertCustomPlatformRolePermissions,
    getPlatformRolePermissionCatalog,
    isStrictPermissionSubset,
};
