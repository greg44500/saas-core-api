import {
    DEFAULT_PLATFORM_ROLE_PERMISSIONS,
} from '../constants/platformPermissions.constants.js';
import {
    PLATFORM_ROLE,
} from '../constants/platformRoles.constants.js';
import {
    ACTIVE_PLATFORM_PERMISSION_REGISTRY,
} from '../config/applicationPlatformPermission.registry.js';
import { AppError } from '../utils/appError.js';


/**
 * Construit un middleware d'autorisation Platform basé sur des permissions.
 *
 * Tant que A4 n'a pas basculé l'autorité runtime vers PlatformTeamMember,
 * `authenticate` recharge encore User.platformRole depuis MongoDB. Le JWT ne
 * constitue donc déjà pas la source d'autorité.
 *
 * Le `super_admin` reçoit automatiquement toutes les permissions du registre
 * applicatif actif, y compris celles ajoutées par un SaaS dérivé.
 */
const createAuthorizePlatformPermission = ({
    rolePermissions = DEFAULT_PLATFORM_ROLE_PERMISSIONS,
    knownPermissions =
        ACTIVE_PLATFORM_PERMISSION_REGISTRY.permissionKeys,
} = {}) => {
    const knownPermissionSet = new Set(knownPermissions);

    return (...requiredPermissions) => {
        if (
            requiredPermissions.length === 0
            || requiredPermissions.some(
                (permission) => !knownPermissionSet.has(permission),
            )
        ) {
            throw new TypeError(
                'authorizePlatformPermission requires known platform permissions',
            );
        }

        return (req, res, next) => {
            if (!req.user) {
                return next(
                    new AppError(
                        'Contexte utilisateur indisponible',
                        403,
                    ),
                );
            }

            if (
                req.user.platformRole
                === PLATFORM_ROLE.SUPER_ADMIN
            ) {
                return next();
            }

            const grantedPermissions = new Set(
                rolePermissions[req.user.platformRole] ?? [],
            );

            const authorized = requiredPermissions.every(
                (permission) =>
                    grantedPermissions.has(permission),
            );

            if (!authorized) {
                return next(
                    new AppError(
                        'Accès plateforme non autorisé',
                        403,
                    ),
                );
            }

            next();
        };
    };
};

const authorizePlatformPermission =
    createAuthorizePlatformPermission();


export {
    authorizePlatformPermission,
    createAuthorizePlatformPermission,
};
