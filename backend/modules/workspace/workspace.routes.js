import { Router } from 'express';

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorizePermission } from '../../middlewares/authorizePermission.js';
import { loadWorkspaceContext } from '../../middlewares/loadWorkspaceContext.js';
import { validateRequest } from '../../middlewares/validateRequest.js';

import {
    create,
    getById,
    list,
    listMembers,
    update,
} from './workspace.controller.js';

import {
    createWorkspaceSchema,
    updateWorkspaceSchema,
    listWorkspaceMembersQuerySchema,
    workspaceIdParamsSchema,
} from './workspace.validation.js';


const router = Router();

/**
 * Crée un workspace pour l'utilisateur authentifié.
 *
 * authenticate est exécuté avant la validation afin que seuls
 * les utilisateurs authentifiés puissent atteindre cette opération.
 */
router.post(
    '/',
    authenticate,
    validateRequest({
        body: createWorkspaceSchema,
    }),
    create,
);
/** 
* Liste les workspaces actuellement accessibles à l'utilisateur à partir de ses memberships actifs.
*/
router.get(
    '/',
    authenticate,
    list,
);

/**
 * Liste les membres actuels d’un workspace.
 *
 * Le workspace et le membership du demandeur doivent être actifs.
 * La consultation exige explicitement la permission member:read.
 */
router.get(
    '/:workspaceId/members',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
        query: listWorkspaceMembersQuerySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        CORE_PERMISSION.MEMBER_READ,
    ),
    listMembers,
);

/**
 * Retourne un workspace accessible à l'utilisateur connecté.
 *
 * L'identifiant est validé avant le chargement du contexte multi-tenant.
 * La permission de lecture du workspace est ensuite vérifiée explicitement.
 */
router.get(
    '/:workspaceId',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        CORE_PERMISSION.WORKSPACE_READ,
    ),
    getById,
);


/**
 * Modifie le nom d'un workspace accessible à l'utilisateur connecté.
 *
 * Le workspace doit être actif et le membre doit posséder
 * explicitement la permission workspace:update.
 */
router.patch(
    '/:workspaceId',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
        body: updateWorkspaceSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        CORE_PERMISSION.WORKSPACE_UPDATE,
    ),
    update,
);


export { router as workspaceRouter };