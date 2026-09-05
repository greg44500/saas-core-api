import { Router } from 'express';

import {
    CORE_PERMISSION,
} from '../../constants/permissions.constants.js';
import { authenticate } from '../../middlewares/authenticate.js';
import {
    authorizePermission,
} from '../../middlewares/authorizePermission.js';
import {
    enforceWorkspaceAccessMode,
} from '../../middlewares/enforceWorkspaceAccessMode.js';
import {
    loadWorkspaceContext,
} from '../../middlewares/loadWorkspaceContext.js';
import {
    validateRequest,
} from '../../middlewares/validateRequest.js';
import {
    workspaceIdParamsSchema,
} from './workspace.validation.js';
import {
    transferOwnership,
} from './workspaceOwnership.controller.js';
import {
    transferWorkspaceOwnershipBodySchema,
} from './workspaceOwnership.validation.js';


const router = Router({
    mergeParams: true,
});


router.patch(
    '/',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
        body: transferWorkspaceOwnershipBodySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        CORE_PERMISSION.WORKSPACE_OWNERSHIP_TRANSFER,
    ),
    /*
     * Le transfert ne crée aucune consommation supplémentaire et peut rester
     * nécessaire pour la gouvernance du tenant pendant une remédiation. La
     * politique est déclarée explicitement plutôt que de contourner le mode
     * d'accès Workspace.
     */
    enforceWorkspaceAccessMode({
        allowDuringRemediation: true,
    }),
    transferOwnership,
);


export { router as workspaceOwnershipRouter };
