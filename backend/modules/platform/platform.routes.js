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
    platformUserIdParamsSchema,
    updatePlatformUserRoleBodySchema,
    platformWorkspaceIdParamsSchema,
    suspendPlatformWorkspaceBodySchema
} from './platform.validation.js';

import {
    paginationQuerySchema,
} from '../../utils/validations/pagination.validation.js';

import {
    disableUser,
    enableUser,
    getUserById,
    listUsers,
    listWorkspaces,
    revokeUserSessions,
    updateUserRole,
    getWorkspaceById,
    suspendWorkspace,
    reactivateWorkspace,
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
        query: paginationQuerySchema,
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

/**
 * Révoque toutes les sessions actives d'un utilisateur.
 *
 * Cette action de sécurité est réservée au super-admin.
 * L'utilisateur ciblé devra se reconnecter sur tous ses appareils.
 */
platformRouter.post(
    '/users/:userId/revoke-sessions',
    authorizePlatformRole(
        PLATFORM_ROLE.SUPER_ADMIN,
    ),
    validateRequest({
        params: platformUserIdParamsSchema,
    }),
    revokeUserSessions,
);

/**
 * Modifie le rôle global d'un utilisateur.
 *
 * Cette opération est réservée au super-admin car elle modifie
 * les privilèges globaux et invalide toutes les sessions actives
 * de l'utilisateur ciblé.
 */
platformRouter.patch(
    '/users/:userId/role',
    authorizePlatformRole(
        PLATFORM_ROLE.SUPER_ADMIN,
    ),
    validateRequest({
        params: platformUserIdParamsSchema,
        body: updatePlatformUserRoleBodySchema,
    }),
    updateUserRole,
);

/*
 * Liste administrative globale des workspaces.
 *
 * Cette route appartient au périmètre Platform et ne passe donc pas par
 * loadWorkspaceContext : le super administrateur doit pouvoir consulter
 * tous les workspaces, y compris ceux qui sont suspendus ou indisponibles.
 *
 * La pagination est validée avant l'appel du controller afin de garantir
 * un contrat d'entrée uniforme pour toutes les listes administratives.
 */
platformRouter.get(
    '/workspaces',
    authorizePlatformRole(
        PLATFORM_ROLE.SUPER_ADMIN,
    ),
    validateRequest({
        query: paginationQuerySchema,
    }),
    listWorkspaces,
);

/*
 * Retourne le détail administratif d'un workspace.
 *
 * Cette route appartient au périmètre Platform et ne passe donc pas par
 * loadWorkspaceContext : un super administrateur doit pouvoir consulter
 * un workspace même lorsqu'il est suspendu, archivé ou fermé.
 *
 * L'identifiant est validé avant l'appel du controller afin d'éviter
 * de transmettre à Mongoose un ObjectId manifestement invalide.
 */
platformRouter.get(
    '/workspaces/:workspaceId',
    authorizePlatformRole(
        PLATFORM_ROLE.SUPER_ADMIN,
    ),
    validateRequest({
        params:
            platformWorkspaceIdParamsSchema,
    }),
    getWorkspaceById,
);

/*
 * Suspend administrativement un workspace actif.
 *
 * Cette opération appartient au périmètre Platform et ne passe donc pas
 * par loadWorkspaceContext : le super administrateur agit sur l'état global
 * du tenant, indépendamment de ses memberships et permissions internes.
 *
 * Le workspaceId et le motif de suspension sont validés avant l'appel
 * du controller afin que le service reçoive uniquement des données conformes
 * à son contrat métier.
 */
platformRouter.patch(
    '/workspaces/:workspaceId/suspend',
    authorizePlatformRole(
        PLATFORM_ROLE.SUPER_ADMIN,
    ),
    validateRequest({
        params:
            platformWorkspaceIdParamsSchema,
        body:
            suspendPlatformWorkspaceBodySchema,
    }),
    suspendWorkspace,
);

/*
 * Réactive administrativement un workspace suspendu.
 *
 * Cette opération appartient au périmètre Platform et ne passe pas par
 * loadWorkspaceContext : le super administrateur modifie l'état global
 * du tenant indépendamment des permissions internes du workspace.
 *
 * Le workspaceId est validé avant l'appel du controller.
 * Aucun body n'est requis : la transition cible est toujours ACTIVE.
 */
platformRouter.patch(
    '/workspaces/:workspaceId/reactivate',
    authorizePlatformRole(
        PLATFORM_ROLE.SUPER_ADMIN,
    ),
    validateRequest({
        params:
            platformWorkspaceIdParamsSchema,
    }),
    reactivateWorkspace,
);


export {
    platformRouter,
};