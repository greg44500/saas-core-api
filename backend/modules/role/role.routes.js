import { Router } from 'express';

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorizePermission } from '../../middlewares/authorizePermission.js';
import { enforcePlanFeature } from '../../middlewares/enforcePlanFeature.js';
import {
    enforceWorkspaceAccessMode,
} from '../../middlewares/enforceWorkspaceAccessMode.js';
import { loadWorkspaceContext } from '../../middlewares/loadWorkspaceContext.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import {
    CORE_PLAN_FEATURE,
} from '../plan/planCapability.registry.js';
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
    enforcePlanFeature(CORE_PLAN_FEATURE.TEAM_MANAGEMENT),
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
    enforcePlanFeature(CORE_PLAN_FEATURE.TEAM_MANAGEMENT),
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
    enforcePlanFeature(CORE_PLAN_FEATURE.TEAM_MANAGEMENT),
    update,
);

roleRouter.delete(
    '/:roleId',
    authenticate,
    validateRequest({ params: roleParamsSchema }),
    loadWorkspaceContext,
    authorizePermission(CORE_PERMISSION.ROLE_DELETE),
    enforceWorkspaceAccessMode(),
    enforcePlanFeature(CORE_PLAN_FEATURE.TEAM_MANAGEMENT),
    remove,
);

export { roleRouter };
