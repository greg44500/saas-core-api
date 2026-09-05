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
    archiveCurrentOwnerWorkspace,
} from './workspaceClosure.controller.js';
import { archiveWorkspaceBodySchema } from './workspaceClosure.validation.js';

const workspaceArchiveRouter = Router({ mergeParams: true });

workspaceArchiveRouter.post(
    '/',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
        body: archiveWorkspaceBodySchema,
    }),
    loadWorkspaceContext,
    authorizeWorkspaceOwner,
    enforceWorkspaceAccessMode({
        allowDuringRemediation: true,
    }),
    archiveCurrentOwnerWorkspace,
);

export { workspaceArchiveRouter };
