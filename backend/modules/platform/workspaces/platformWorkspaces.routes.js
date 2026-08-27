import { Router } from 'express';
import { PLATFORM_ROLE } from '../../../constants/platformRoles.constants.js';
import { authorizePlatformRole } from '../../../middlewares/authorizePlatformRole.js';
import { validateRequest } from '../../../middlewares/validateRequest.js';
import { paginationQuerySchema } from '../../../utils/validations/pagination.validation.js';
import {
    getWorkspaceById,
    listWorkspaces,
    reactivateWorkspace,
    suspendWorkspace,
} from '../platform.controller.js';
import {
    platformWorkspaceIdParamsSchema,
    suspendPlatformWorkspaceBodySchema,
} from './platformWorkspaces.validation.js';

const platformWorkspacesRouter = Router();

platformWorkspacesRouter.get(
    '/',
    authorizePlatformRole(PLATFORM_ROLE.SUPER_ADMIN),
    validateRequest({ query: paginationQuerySchema }),
    listWorkspaces,
);

platformWorkspacesRouter.get(
    '/:workspaceId',
    authorizePlatformRole(PLATFORM_ROLE.SUPER_ADMIN),
    validateRequest({ params: platformWorkspaceIdParamsSchema }),
    getWorkspaceById,
);

platformWorkspacesRouter.patch(
    '/:workspaceId/suspend',
    authorizePlatformRole(PLATFORM_ROLE.SUPER_ADMIN),
    validateRequest({
        params: platformWorkspaceIdParamsSchema,
        body: suspendPlatformWorkspaceBodySchema,
    }),
    suspendWorkspace,
);

platformWorkspacesRouter.patch(
    '/:workspaceId/reactivate',
    authorizePlatformRole(PLATFORM_ROLE.SUPER_ADMIN),
    validateRequest({ params: platformWorkspaceIdParamsSchema }),
    reactivateWorkspace,
);

export { platformWorkspacesRouter };
