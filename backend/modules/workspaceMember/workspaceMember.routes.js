import { Router } from 'express';

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorizePermission } from '../../middlewares/authorizePermission.js';
import { authorizeRoleDelegation } from '../../middlewares/authorizeRoleDelegation.js';
import { enforcePlanFeature } from '../../middlewares/enforcePlanFeature.js';
import {
    enforceWorkspaceAccessMode,
} from '../../middlewares/enforceWorkspaceAccessMode.js';
import { loadWorkspaceContext } from '../../middlewares/loadWorkspaceContext.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import {
    CORE_PLAN_FEATURE,
} from '../plan/planCapability.registry.js';
import { remove, suspend, updateRole } from './workspaceMember.controller.js';
import {
    updateWorkspaceMemberRoleBodySchema,
    workspaceMemberParamsSchema,
} from './workspaceMember.validation.js';

const workspaceMemberRouter = Router({ mergeParams: true });

workspaceMemberRouter.patch(
    '/:memberId/role',
    authenticate,
    validateRequest({
        params: workspaceMemberParamsSchema,
        body: updateWorkspaceMemberRoleBodySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(CORE_PERMISSION.MEMBER_UPDATE),
    enforceWorkspaceAccessMode(),
    enforcePlanFeature(CORE_PLAN_FEATURE.TEAM_MANAGEMENT),
    authorizeRoleDelegation,
    updateRole,
);

workspaceMemberRouter.post(
    '/:memberId/suspend',
    authenticate,
    validateRequest({ params: workspaceMemberParamsSchema }),
    loadWorkspaceContext,
    authorizePermission(CORE_PERMISSION.MEMBER_SUSPEND),
    enforceWorkspaceAccessMode(),
    enforcePlanFeature(CORE_PLAN_FEATURE.TEAM_MANAGEMENT),
    suspend,
);

/*
 * La suppression d'un membre peut participer à une remédiation de quota, mais
 * elle reste une action de gestion d'équipe. La feature commerciale doit donc
 * être disponible même si l'access mode général autorise cette remédiation.
 */
workspaceMemberRouter.delete(
    '/:memberId',
    authenticate,
    validateRequest({ params: workspaceMemberParamsSchema }),
    loadWorkspaceContext,
    authorizePermission(CORE_PERMISSION.MEMBER_REMOVE),
    enforceWorkspaceAccessMode({ allowDuringRemediation: true }),
    enforcePlanFeature(CORE_PLAN_FEATURE.TEAM_MANAGEMENT),
    remove,
);

export { workspaceMemberRouter };
