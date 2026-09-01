import { Router } from 'express';

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorizePermission } from '../../middlewares/authorizePermission.js';
import { loadWorkspaceContext } from '../../middlewares/loadWorkspaceContext.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { workspaceIdParamsSchema } from '../workspace/workspace.validation.js';
import { list } from './role.controller.js';

const roleRouter = Router({ mergeParams: true });

roleRouter.get(
    '/',
    authenticate,
    validateRequest({ params: workspaceIdParamsSchema }),
    loadWorkspaceContext,
    authorizePermission(CORE_PERMISSION.ROLE_READ),
    list,
);

export { roleRouter };
