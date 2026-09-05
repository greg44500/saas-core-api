import mongoose from 'mongoose';

import {
    ACTIVE_PLATFORM_PERMISSION_REGISTRY,
} from '../../config/applicationPlatformPermission.registry.js';
import {
    PLATFORM_PERMISSION_SENSITIVITY,
} from '../../constants/platformPermissions.constants.js';
import {
    PLATFORM_ROLE,
} from '../../constants/platformRoles.constants.js';
import {
    PLATFORM_ROLE_STATUS,
    PLATFORM_TEAM_MEMBER_STATUS,
    PLATFORM_TEAM_ROLE_KEY,
} from '../../constants/platformTeam.constants.js';
import { AppError } from '../../utils/appError.js';
import { PlatformRole } from '../platformRole/platformRole.model.js';
import { PlatformTeamMember } from './platformTeamMember.model.js';


const ACTIVE_MEMBER_STATUSES = Object.freeze([
    PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
    PLATFORM_TEAM_MEMBER_STATUS.SUSPENDED,
]);

const KNOWN_PERMISSION_KEYS = new Set(
    ACTIVE_PLATFORM_PERMISSION_REGISTRY.permissionKeys,
);

const RESERVED_PERMISSION_KEYS = new Set(
    ACTIVE_PLATFORM_PERMISSION_REGISTRY.definitions
        .filter(
            ({ sensitivity }) =>
                sensitivity === PLATFORM_PERMISSION_SENSITIVITY.RESERVED,
        )
        .map(({ key }) => key),
);

const applySession = (query, session) => (
    session ? query.session(session) : query
);

/**
 * Calcule les permissions effectives d'un rôle stocké en base.
 *
 * Le rôle Super administrateur ne dépend jamais de la copie persistée de ses
 * permissions : il reçoit toujours le registre actif complet afin que les
 * extensions d'un SaaS dérivé soient couvertes automatiquement.
 */
const getPlatformRoleEffectivePermissions = (role) => {
    if (!role || role.status !== PLATFORM_ROLE_STATUS.ACTIVE) {
        throw new AppError(
            'Le rôle de Plateforme est indisponible.',
            403,
        );
    }

    if (role.key === PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN) {
        return Object.freeze([
            ...ACTIVE_PLATFORM_PERMISSION_REGISTRY.permissionKeys,
        ]);
    }

    const permissions = Array.isArray(role.permissions)
        ? role.permissions
        : [];

    if (
        permissions.some(
            (permission) => !KNOWN_PERMISSION_KEYS.has(permission),
        )
    ) {
        throw new AppError(
            'La configuration du rôle de Plateforme est invalide.',
            403,
        );
    }

    if (
        permissions.some(
            (permission) => RESERVED_PERMISSION_KEYS.has(permission),
        )
    ) {
        throw new AppError(
            'La configuration du rôle de Plateforme contient une permission réservée.',
            403,
        );
    }

    return Object.freeze([...new Set(permissions)]);
};

/**
 * Résout l'autorité Platform courante depuis MongoDB.
 *
 * `sanitizeFilter` reste actif globalement. Le `$in` interne est donc marqué
 * explicitement avec mongoose.trusted() : il provient de constantes serveur,
 * jamais d'une entrée utilisateur.
 *
 * Le fallback `User.platformRole === super_admin` est strictement transitoire :
 * il n'est utilisé que si aucun historique PlatformTeamMember n'existe pour le
 * User. Dès qu'une appartenance a existé, son cycle de vie devient autoritaire
 * et une révocation ne peut pas réactiver les anciens pouvoirs par accident.
 */
const resolvePlatformAuthorization = async ({
    user,
    session = null,
}) => {
    if (!user?._id) {
        throw new TypeError(
            'user is required to resolve Platform authorization',
        );
    }

    const currentMembershipQuery = PlatformTeamMember.findOne({
        user: user._id,
        status: mongoose.trusted({
            $in: ACTIVE_MEMBER_STATUSES,
        }),
    });

    const currentMembership = await applySession(
        currentMembershipQuery,
        session,
    );

    if (currentMembership) {
        if (
            currentMembership.status
            === PLATFORM_TEAM_MEMBER_STATUS.SUSPENDED
        ) {
            return {
                source: 'team_member',
                membership: currentMembership,
                role: null,
                roleKey: null,
                permissions: Object.freeze([]),
                isFounder: currentMembership.isFounder === true,
                status: currentMembership.status,
            };
        }

        const roleQuery = PlatformRole.findById(
            currentMembership.role,
        );
        const role = await applySession(roleQuery, session);
        const permissions = getPlatformRoleEffectivePermissions(role);

        return {
            source: 'team_member',
            membership: currentMembership,
            role,
            roleKey: role.key,
            permissions,
            isFounder: currentMembership.isFounder === true,
            status: currentMembership.status,
        };
    }

    const historicalMembershipQuery = PlatformTeamMember.exists({
        user: user._id,
    });
    const hasHistoricalMembership = await applySession(
        historicalMembershipQuery,
        session,
    );

    if (hasHistoricalMembership) {
        return {
            source: 'team_history',
            membership: null,
            role: null,
            roleKey: null,
            permissions: Object.freeze([]),
            isFounder: false,
            status: PLATFORM_TEAM_MEMBER_STATUS.REVOKED,
        };
    }

    if (user.platformRole === PLATFORM_ROLE.SUPER_ADMIN) {
        return {
            source: 'legacy_super_admin',
            membership: null,
            role: null,
            roleKey: PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
            permissions: Object.freeze([
                ...ACTIVE_PLATFORM_PERMISSION_REGISTRY.permissionKeys,
            ]),
            isFounder: false,
            status: PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
        };
    }

    return {
        source: 'none',
        membership: null,
        role: null,
        roleKey: null,
        permissions: Object.freeze([]),
        isFounder: false,
        status: null,
    };
};


export {
    getPlatformRoleEffectivePermissions,
    resolvePlatformAuthorization,
};
