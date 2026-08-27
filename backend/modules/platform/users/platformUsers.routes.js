import { Router } from 'express';
import { PLATFORM_ROLE } from '../../../constants/platformRoles.constants.js';
import { authorizePlatformRole } from '../../../middlewares/authorizePlatformRole.js';
import { validateRequest } from '../../../middlewares/validateRequest.js';
import { paginationQuerySchema } from '../../../utils/validations/pagination.validation.js';
import {
    disableUser,
    enableUser,
    getUserById,
    listUsers,
    revokeUserSessions,
    updateUserRole,
} from '../platform.controller.js';
import {
    disablePlatformUserBodySchema,
    platformUserIdParamsSchema,
    updatePlatformUserRoleBodySchema,
} from './platformUsers.validation.js';

const platformUsersRouter = Router();

platformUsersRouter.get(
    '/',
    authorizePlatformRole(PLATFORM_ROLE.SUPER_ADMIN),
    validateRequest({ query: paginationQuerySchema }),
    listUsers,
);

platformUsersRouter.get(
    '/:userId',
    authorizePlatformRole(PLATFORM_ROLE.SUPER_ADMIN),
    validateRequest({ params: platformUserIdParamsSchema }),
    getUserById,
);

platformUsersRouter.patch(
    '/:userId/disable',
    authorizePlatformRole(PLATFORM_ROLE.SUPER_ADMIN),
    validateRequest({
        params: platformUserIdParamsSchema,
        body: disablePlatformUserBodySchema,
    }),
    disableUser,
);

platformUsersRouter.patch(
    '/:userId/enable',
    authorizePlatformRole(PLATFORM_ROLE.SUPER_ADMIN),
    validateRequest({ params: platformUserIdParamsSchema }),
    enableUser,
);

platformUsersRouter.post(
    '/:userId/revoke-sessions',
    authorizePlatformRole(PLATFORM_ROLE.SUPER_ADMIN),
    validateRequest({ params: platformUserIdParamsSchema }),
    revokeUserSessions,
);

platformUsersRouter.patch(
    '/:userId/role',
    authorizePlatformRole(PLATFORM_ROLE.SUPER_ADMIN),
    validateRequest({
        params: platformUserIdParamsSchema,
        body: updatePlatformUserRoleBodySchema,
    }),
    updateUserRole,
);

export { platformUsersRouter };
