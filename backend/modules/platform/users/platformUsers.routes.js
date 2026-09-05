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
    closeUser,
    disableUser,
    enableUser,
    getUserById,
    listUsers,
    revokeUserSessions,
} from './platformUsers.controller.js';
import {
    closePlatformUserBodySchema,
    disablePlatformUserBodySchema,
    platformUserIdParamsSchema,
} from './platformUsers.validation.js';

const platformUsersRouter = Router();

platformUsersRouter.get(
    '/',
    authorizePlatformPermission(PLATFORM_PERMISSION.USERS_READ),
    validateRequest({ query: paginationQuerySchema }),
    listUsers,
);

platformUsersRouter.get(
    '/:userId',
    authorizePlatformPermission(PLATFORM_PERMISSION.USERS_READ),
    validateRequest({ params: platformUserIdParamsSchema }),
    getUserById,
);

platformUsersRouter.patch(
    '/:userId/disable',
    authorizePlatformPermission(PLATFORM_PERMISSION.USERS_DISABLE),
    validateRequest({
        params: platformUserIdParamsSchema,
        body: disablePlatformUserBodySchema,
    }),
    disableUser,
);

platformUsersRouter.patch(
    '/:userId/enable',
    authorizePlatformPermission(PLATFORM_PERMISSION.USERS_ENABLE),
    validateRequest({ params: platformUserIdParamsSchema }),
    enableUser,
);

platformUsersRouter.patch(
    '/:userId/close',
    authorizePlatformPermission(PLATFORM_PERMISSION.USERS_CLOSE),
    validateRequest({
        params: platformUserIdParamsSchema,
        body: closePlatformUserBodySchema,
    }),
    closeUser,
);

platformUsersRouter.post(
    '/:userId/revoke-sessions',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.USERS_REVOKE_SESSIONS,
    ),
    validateRequest({ params: platformUserIdParamsSchema }),
    revokeUserSessions,
);

/**
 * L'ancien endpoint /:userId/role est volontairement retiré.
 * Les rôles d'administration sont désormais gérés uniquement via
 * PlatformTeamMember + PlatformRole afin d'éviter toute élévation parallèle
 * par User.platformRole.
 */

export { platformUsersRouter };
