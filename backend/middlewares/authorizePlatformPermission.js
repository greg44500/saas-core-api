import {
    DEFAULT_PLATFORM_ROLE_PERMISSIONS,
} from '../constants/platformPermissions.constants.js';
import {
    ACTIVE_PLATFORM_PERMISSION_REGISTRY,
} from '../config/applicationPlatformPermission.registry.js';
import { AppError } from '../utils/appError.js';
import {
    resolvePlatformAuthorization,
} from '../modules/platformTeam/platformAuthorization.service.js';


/**
 * Construit un middleware d'autorisation Platform basé sur les permissions
 * effectives rechargées depuis MongoDB.
 *
 * La factory conserve l'injection `rolePermissions` pour les tests unitaires et
 * la compatibilité de certaines politiques isolées. En runtime normal,
 * PlatformTeamMember + PlatformRole constituent désormais l'autorité.
 */
const createAuthorizePlatformPermission = ({
    rolePermissions = null,
    authorizationResolver = null,
    knownPermissions =
        ACTIVE_PLATFORM_PERMISSION_REGISTRY.permissionKeys,
} = {}) => {
    const knownPermissionSet = new Set(knownPermissions);

    const resolveAuthorization = authorizationResolver
        ?? (
            rolePermissions
                ? async ({ user }) => ({
                    permissions:
                        DEFAULT_PLATFORM_ROLE_PERMISSIONS[user.platformRole]
                        ?? rolePermissions[user.platformRole]
                        ?? [],
                })
                : resolvePlatformAuthorization
        );

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

        return async (req, res, next) => {
            if (!req.user) {
                return next(
                    new AppError(
                        'Contexte utilisateur indisponible',
                        403,
                    ),
                );
            }

            try {
                const authorization = await resolveAuthorization({
                    user: req.user,
                });

                const grantedPermissions = new Set(
                    authorization?.permissions ?? [],
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

                req.platformAuthorization = authorization;
                return next();
            } catch (error) {
                return next(error);
            }
        };
    };
};

const authorizePlatformPermission =
    createAuthorizePlatformPermission();


export {
    authorizePlatformPermission,
    createAuthorizePlatformPermission,
};
