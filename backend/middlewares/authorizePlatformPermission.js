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
 * Construit une factory d'autorisation Platform à partir de permissions
 * effectives résolues côté backend.
 *
 * En runtime normal, `PlatformTeamMember` et `PlatformRole` sont l'autorité :
 * le middleware recharge l'autorisation depuis MongoDB et ne fait jamais
 * confiance à une permission déclarée par le frontend ou à une valeur portée
 * uniquement par le JWT.
 *
 * `knownPermissions` ferme la factory aux permissions enregistrées dans le
 * registre applicatif. Une faute de configuration est donc détectée au montage
 * des routes plutôt que transformée silencieusement en règle d'accès ambiguë.
 *
 * L'injection `rolePermissions` ou `authorizationResolver` existe pour les tests
 * et les politiques isolées ; elle ne doit pas devenir un chemin permettant de
 * contourner l'autorité persistée en production.
 *
 * Le middleware retourné exige toutes les permissions demandées, enrichit la
 * requête avec `req.platformAuthorization` en cas de succès et échoue fermé si
 * le contexte utilisateur ou les permissions sont insuffisants.
 *
 * @param {object} [options]
 * @param {object|null} [options.rolePermissions]
 * @param {Function|null} [options.authorizationResolver]
 * @param {Iterable<string>} [options.knownPermissions]
 * @returns {(...requiredPermissions: string[]) => import('express').RequestHandler}
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
                        rolePermissions[user.platformRole]
                        ?? DEFAULT_PLATFORM_ROLE_PERMISSIONS[user.platformRole]
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