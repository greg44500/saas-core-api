import { Router } from 'express';

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorizePermission } from '../../middlewares/authorizePermission.js';
import { loadWorkspaceContext } from '../../middlewares/loadWorkspaceContext.js';
import { validateRequest } from '../../middlewares/validateRequest.js';

import {
    create,
    getById,
} from './workspace.controller.js';

import {
    createWorkspaceSchema,
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


export { router as workspaceRouter };