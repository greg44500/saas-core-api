import { Router } from 'express';

import {
    PLATFORM_PERMISSION,
} from '../../constants/platformPermissions.constants.js';
import {
    authorizePlatformPermission,
} from '../../middlewares/authorizePlatformPermission.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import {
    paginationQuerySchema,
} from '../../utils/validations/pagination.validation.js';
import {
    list,
    reactivate,
    revoke,
    summary,
    suspend,
    updateRole,
} from './platformTeam.controller.js';
import {
    platformTeamMemberIdParamsSchema,
    updatePlatformTeamMemberRoleBodySchema,
} from './platformTeam.validation.js';


const platformTeamRouter = Router();

platformTeamRouter.get(
    '/summary',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.TEAM_READ,
    ),
    summary,
);

platformTeamRouter.get(
    '/members',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.TEAM_READ,
    ),
    validateRequest({
        query: paginationQuerySchema,
    }),
    list,
);

platformTeamRouter.patch(
    '/members/:memberId/role',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.TEAM_MEMBER_ROLE_UPDATE,
    ),
    validateRequest({
        params: platformTeamMemberIdParamsSchema,
        body: updatePlatformTeamMemberRoleBodySchema,
    }),
    updateRole,
);

platformTeamRouter.patch(
    '/members/:memberId/suspend',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.TEAM_MEMBER_SUSPEND,
    ),
    validateRequest({
        params: platformTeamMemberIdParamsSchema,
    }),
    suspend,
);

platformTeamRouter.patch(
    '/members/:memberId/reactivate',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.TEAM_MEMBER_REACTIVATE,
    ),
    validateRequest({
        params: platformTeamMemberIdParamsSchema,
    }),
    reactivate,
);

platformTeamRouter.delete(
    '/members/:memberId',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.TEAM_MEMBER_REVOKE,
    ),
    validateRequest({
        params: platformTeamMemberIdParamsSchema,
    }),
    revoke,
);


export { platformTeamRouter };
