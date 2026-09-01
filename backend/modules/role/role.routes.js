import { Router } from 'express';

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorizePermission } from '../../middlewares/authorizePermission.js';
import {
    enforceWorkspaceAccessMode,
} from '../../middlewares/enforceWorkspaceAccessMode.js';
import { loadWorkspaceContext } from '../../middlewares/loadWorkspaceContext.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { workspaceIdParamsSchema } from '../workspace/workspace.validation.js';
import {
    create,
    list,
    remove,
    update,
} from './role.controller.js';
import {
    createWorkspaceRoleBodySchema,
    roleParamsSchema,
    updateWorkspaceRoleBodySchema,
} from './role.validation.js';

const roleRouter = Router({ mergeParams: true });

roleRouter.get(
    '/',
    authenticate,
    validateRequest({ params: workspaceIdParamsSchema }),
    loadWorkspaceContext,
    authorizePermission(CORE_PERMISSION.ROLE_READ),
    list,
);

roleRouter.post(
    '/',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
        body: createWorkspaceRoleBodySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(CORE_PERMISSION.ROLE_CREATE),
    enforceWorkspaceAccessMode(),
    create,
);

roleRouter.patch(
    '/:roleId',
    authenticate,
    validateRequest({
        params: roleParamsSchema,
        body: updateWorkspaceRoleBodySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(CORE_PERMISSION.ROLE_UPDATE),
    enforceWorkspaceAccessMode(),
    update,
);

roleRouter.delete(
    '/:roleId',
    authenticate,
    validateRequest({ params: roleParamsSchema }),
    loadWorkspaceContext,
    authorizePermission(CORE_PERMISSION.ROLE_DELETE),
    enforceWorkspaceAccessMode(),
    remove,
);

export { roleRouter };
