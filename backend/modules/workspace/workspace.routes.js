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
    auditLogRouter,
} from '../auditLog/auditLog.routes.js';
import {
    CORE_PLAN_FEATURE,
} from '../plan/planCapability.registry.js';
import { roleRouter } from '../role/role.routes.js';
import {
    subscriptionRouter,
} from '../subscriptions/subscription.routes.js';
import {
    workspaceMemberRouter,
} from '../workspaceMember/workspaceMember.routes.js';

import {
    create,
    getById,
    list,
    listMembers,
    update,
} from './workspace.controller.js';
import {
    workspaceClosureRouter,
} from './workspaceClosure.routes.js';
import {
    workspaceOwnershipRouter,
} from './workspaceOwnership.routes.js';

import {
    createWorkspaceSchema,
    updateWorkspaceSchema,
    workspaceIdParamsSchema,
} from './workspace.validation.js';

import {
    paginationQuerySchema,
} from '../../utils/validations/pagination.validation.js';

const router = Router();

router.post(
    '/',
    authenticate,
    validateRequest({
        body: createWorkspaceSchema,
    }),
    create,
);

router.get(
    '/',
    authenticate,
    list,
);

router.use(
    '/:workspaceId/subscription',
    subscriptionRouter,
);

router.use(
    '/:workspaceId/audit-logs',
    auditLogRouter,
);

router.use(
    '/:workspaceId/ownership',
    workspaceOwnershipRouter,
);

router.use(
    '/:workspaceId/closure',
    workspaceClosureRouter,
);

router.use(
    '/:workspaceId/members',
    workspaceMemberRouter,
);

/**
 * Les rôles restent une ressource propre au tenant. Le frontend les lit pour
 * alimenter les formulaires d'invitation et de changement de rôle sans jamais
 * coder d'identifiants MongoDB en dur.
 */
router.use(
    '/:workspaceId/roles',
    roleRouter,
);

router.get(
    '/:workspaceId/members',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
        query: paginationQuerySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        CORE_PERMISSION.MEMBER_READ,
    ),
    enforcePlanFeature(
        CORE_PLAN_FEATURE.TEAM_MANAGEMENT,
    ),
    listMembers,
);

router.get(
    '/:workspaceId',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        CORE_PERMISSION.WORKSPACE_READ,
    ),
    getById,
);

router.patch(
    '/:workspaceId',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
        body: updateWorkspaceSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        CORE_PERMISSION.WORKSPACE_UPDATE,
    ),
    enforceWorkspaceAccessMode(),
    update,
);

export { router as workspaceRouter };
