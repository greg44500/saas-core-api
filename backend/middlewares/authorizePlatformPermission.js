import {
    DEFAULT_PLATFORM_ROLE_PERMISSIONS,
    PLATFORM_PERMISSIONS,
} from '../constants/platformPermissions.constants.js';
import { AppError } from '../utils/appError.js';


const PLATFORM_PERMISSION_SET = new Set(PLATFORM_PERMISSIONS);

/**
 * Construit un middleware d'autorisation Platform basé sur des permissions.
 *
 * Les permissions sont dérivées du rôle Platform rechargé depuis MongoDB par
 * `authenticate`. Le JWT ne constitue donc pas la source d'autorité.
 *
 * Le registre de rôles est injectable pour les tests et une future politique
 * Platform plus fine, sans modifier les routes qui expriment leurs besoins.
 */
const createAuthorizePlatformPermission = ({
    rolePermissions = DEFAULT_PLATFORM_ROLE_PERMISSIONS,
} = {}) => (...requiredPermissions) => {
    if (
        requiredPermissions.length === 0
        || requiredPermissions.some(
            (permission) => !PLATFORM_PERMISSION_SET.has(permission),
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

        const grantedPermissions = new Set(
            rolePermissions[req.user.platformRole] ?? [],
        );

        const authorized = requiredPermissions.every(
            (permission) => grantedPermissions.has(permission),
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

const authorizePlatformPermission =
    createAuthorizePlatformPermission();


export {
    authorizePlatformPermission,
    createAuthorizePlatformPermission,
};
