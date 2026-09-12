import { Router } from 'express';

import {
    PLATFORM_PERMISSION,
} from '../../../constants/platformPermissions.constants.js';
import {
    authorizePlatformPermission,
} from '../../../middlewares/authorizePlatformPermission.js';
import { validateRequest } from '../../../middlewares/validateRequest.js';
import { paginationQuerySchema } from '../../../utils/validations/pagination.validation.js';
import {
    authorizeOwnershipTransfer,
    closeWorkspace,
    getOwnershipTransferAuthorization,
    getWorkspaceById,
    listWorkspaces,
    reactivateWorkspace,
    revokeOwnershipTransferAuthorization,
    suspendWorkspace,
} from './platformWorkspaces.controller.js';
import {
    closePlatformWorkspaceBodySchema,
    platformWorkspaceIdParamsSchema,
    suspendPlatformWorkspaceBodySchema,
} from './platformWorkspaces.validation.js';

const platformWorkspacesRouter = Router();

platformWorkspacesRouter.get(
    '/',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.WORKSPACES_READ,
    ),
    validateRequest({ query: paginationQuerySchema }),
    listWorkspaces,
);

platformWorkspacesRouter.get(
    '/:workspaceId',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.WORKSPACES_READ,
    ),
    validateRequest({ params: platformWorkspaceIdParamsSchema }),
    getWorkspaceById,
);

platformWorkspacesRouter.get(
    '/:workspaceId/ownership-transfer-authorization',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.WORKSPACES_OWNERSHIP_TRANSFER_AUTHORIZE,
    ),
    validateRequest({ params: platformWorkspaceIdParamsSchema }),
    getOwnershipTransferAuthorization,
);

platformWorkspacesRouter.post(
    '/:workspaceId/ownership-transfer-authorization',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.WORKSPACES_OWNERSHIP_TRANSFER_AUTHORIZE,
    ),
    validateRequest({ params: platformWorkspaceIdParamsSchema }),
    authorizeOwnershipTransfer,
);

platformWorkspacesRouter.delete(
    '/:workspaceId/ownership-transfer-authorization',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.WORKSPACES_OWNERSHIP_TRANSFER_AUTHORIZE,
    ),
    validateRequest({ params: platformWorkspaceIdParamsSchema }),
    revokeOwnershipTransferAuthorization,
);

platformWorkspacesRouter.patch(
    '/:workspaceId/suspend',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.WORKSPACES_SUSPEND,
    ),
    validateRequest({
        params: platformWorkspaceIdParamsSchema,
        body: suspendPlatformWorkspaceBodySchema,
    }),
    suspendWorkspace,
);

platformWorkspacesRouter.patch(
    '/:workspaceId/reactivate',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.WORKSPACES_REACTIVATE,
    ),
    validateRequest({ params: platformWorkspaceIdParamsSchema }),
    reactivateWorkspace,
);

platformWorkspacesRouter.patch(
    '/:workspaceId/close',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.WORKSPACES_CLOSE,
    ),
    validateRequest({
        params: platformWorkspaceIdParamsSchema,
        body: closePlatformWorkspaceBodySchema,
    }),
    closeWorkspace,
);

export { platformWorkspacesRouter };
