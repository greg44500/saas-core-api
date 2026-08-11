import { Router } from 'express';

import { authenticate } from '../../middlewares/authenticate.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { create } from './workspace.controller.js';
import { createWorkspaceSchema } from './workspace.validation.js';


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


export { router as workspaceRouter };