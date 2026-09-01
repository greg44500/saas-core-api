import { Router } from 'express';

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorizePermission } from '../../middlewares/authorizePermission.js';
import { authorizeRoleDelegation } from '../../middlewares/authorizeRoleDelegation.js';
import {
    enforceWorkspaceAccessMode,
} from '../../middlewares/enforceWorkspaceAccessMode.js';
import { loadWorkspaceContext } from '../../middlewares/loadWorkspaceContext.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
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
    suspend,
);

/*
 * La suppression d'un membre est une action de remédiation valide : elle peut
 * précisément ramener le workspace sous sa limite members. Elle reste donc
 * disponible lorsque l'accès général est en mode remediation.
 */
workspaceMemberRouter.delete(
    '/:memberId',
    authenticate,
    validateRequest({ params: workspaceMemberParamsSchema }),
    loadWorkspaceContext,
    authorizePermission(CORE_PERMISSION.MEMBER_REMOVE),
    enforceWorkspaceAccessMode({ allowDuringRemediation: true }),
    remove,
);

export { workspaceMemberRouter };
