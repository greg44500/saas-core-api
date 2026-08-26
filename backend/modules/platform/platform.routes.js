import { Router } from 'express';

import {
    PLATFORM_ROLE,
} from '../../constants/platformRoles.constants.js';

import { authenticate } from '../../middlewares/authenticate.js';
import {
    authorizePlatformRole,
} from '../../middlewares/authorizePlatformRole.js';
import {
    validateRequest,
} from '../../middlewares/validateRequest.js';

import {
    disablePlatformUserBodySchema,
    listPlatformUsersQuerySchema,
    platformUserIdParamsSchema,
} from './platform.validation.js';

import {
    disableUser,
    enableUser,
    getUserById,
    listUsers,
} from './platform.controller.js';


const platformRouter = Router();


/**
 * Toutes les routes Platform nécessitent un utilisateur authentifié.
 */
platformRouter.use(authenticate);


/**
 * Liste paginée des utilisateurs de la plateforme.
 *
 * Cette route est volontairement réservée au super-admin
 * pour la première version du module Platform.
 */
platformRouter.get(
    '/users',
    authorizePlatformRole(
        PLATFORM_ROLE.SUPER_ADMIN,
    ),
    validateRequest({
        query: listPlatformUsersQuerySchema,
    }),
    listUsers,
);

/**
 * Retourne le détail administratif d'un utilisateur de la plateforme.
 *
 * L'accès est réservé au super-admin.
 * userId est validé avant l'appel du controller afin d'éviter
 * de transmettre à Mongoose un identifiant manifestement invalide.
 */
platformRouter.get(
    '/users/:userId',
    authorizePlatformRole(
        PLATFORM_ROLE.SUPER_ADMIN,
    ),
    validateRequest({
        params: platformUserIdParamsSchema,
    }),
    getUserById,
);

/**
 * Désactive un utilisateur de la plateforme.
 *
 * Cette opération est réservée au super-admin car elle révoque
 * également toutes les sessions actives de l'utilisateur ciblé.
 */
platformRouter.patch(
    '/users/:userId/disable',
    authorizePlatformRole(
        PLATFORM_ROLE.SUPER_ADMIN,
    ),
    validateRequest({
        params: platformUserIdParamsSchema,
        body: disablePlatformUserBodySchema,
    }),
    disableUser,
);

/**
 * Réactive un utilisateur de la plateforme.
 *
 * L'accès reste réservé au super-admin.
 * Aucune session n'est recréée : l'utilisateur devra se reconnecter.
 */
platformRouter.patch(
    '/users/:userId/enable',
    authorizePlatformRole(
        PLATFORM_ROLE.SUPER_ADMIN,
    ),
    validateRequest({
        params: platformUserIdParamsSchema,
    }),
    enableUser,
);


export {
    platformRouter,
};