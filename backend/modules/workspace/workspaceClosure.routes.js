import { Router } from 'express';

import { authenticate } from '../../middlewares/authenticate.js';
import { authorizeWorkspaceOwner } from '../../middlewares/authorizeWorkspaceOwner.js';
import {
    enforceWorkspaceAccessMode,
} from '../../middlewares/enforceWorkspaceAccessMode.js';
import { loadWorkspaceContext } from '../../middlewares/loadWorkspaceContext.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { workspaceIdParamsSchema } from './workspace.validation.js';
import {
    closeCurrentOwnerWorkspace,
} from './workspaceClosure.controller.js';
import { closeWorkspaceBodySchema } from './workspaceClosure.validation.js';

const workspaceClosureRouter = Router({ mergeParams: true });

workspaceClosureRouter.post(
    '/',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
        body: closeWorkspaceBodySchema,
    }),
    loadWorkspaceContext,
    authorizeWorkspaceOwner,
    enforceWorkspaceAccessMode({
        allowDuringRemediation: true,
    }),
    closeCurrentOwnerWorkspace,
);

export { workspaceClosureRouter };
