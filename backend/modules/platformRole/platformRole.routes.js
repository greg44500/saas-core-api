import { Router } from 'express';

import {
    PLATFORM_PERMISSION,
} from '../../constants/platformPermissions.constants.js';
import {
    authorizePlatformPermission,
} from '../../middlewares/authorizePlatformPermission.js';
import {
    validateRequest,
} from '../../middlewares/validateRequest.js';
import {
    archive,
    create,
    getById,
    list,
    listPermissions,
    update,
} from './platformRole.controller.js';
import {
    createPlatformRoleBodySchema,
    listPlatformRolesQuerySchema,
    platformRoleIdParamsSchema,
    updatePlatformRoleBodySchema,
} from './platformRole.validation.js';


const platformRoleRouter = Router();

platformRoleRouter.get(
    '/permissions',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.ROLES_READ,
    ),
    listPermissions,
);

platformRoleRouter.get(
    '/',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.ROLES_READ,
    ),
    validateRequest({
        query: listPlatformRolesQuerySchema,
    }),
    list,
);

platformRoleRouter.post(
    '/',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.ROLES_CREATE,
    ),
    validateRequest({
        body: createPlatformRoleBodySchema,
    }),
    create,
);

platformRoleRouter.get(
    '/:roleId',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.ROLES_READ,
    ),
    validateRequest({
        params: platformRoleIdParamsSchema,
    }),
    getById,
);

platformRoleRouter.patch(
    '/:roleId',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.ROLES_UPDATE,
    ),
    validateRequest({
        params: platformRoleIdParamsSchema,
        body: updatePlatformRoleBodySchema,
    }),
    update,
);

platformRoleRouter.patch(
    '/:roleId/archive',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.ROLES_ARCHIVE,
    ),
    validateRequest({
        params: platformRoleIdParamsSchema,
    }),
    archive,
);


export {
    platformRoleRouter,
};
