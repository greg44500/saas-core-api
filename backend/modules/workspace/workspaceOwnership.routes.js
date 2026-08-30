import { Router } from 'express';

import {
    CORE_PERMISSION,
} from '../../constants/permissions.constants.js';
import { authenticate } from '../../middlewares/authenticate.js';
import {
    authorizePermission,
} from '../../middlewares/authorizePermission.js';
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
    transferOwnership,
);


export { router as workspaceOwnershipRouter };
