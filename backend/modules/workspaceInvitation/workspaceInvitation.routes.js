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
import {
    paginationQuerySchema,
} from '../../utils/validations/pagination.validation.js';
import {
    accept,
    create,
    list,
    resend,
    revoke,
} from './workspaceInvitation.controller.js';
import {
    acceptWorkspaceInvitationBodySchema,
    createWorkspaceInvitationBodySchema,
    workspaceIdParamsSchema,
    workspaceInvitationParamsSchema,
} from './workspaceInvitation.validation.js';

const workspaceInvitationRouter = Router({ mergeParams: true });

workspaceInvitationRouter.post(
    '/',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
        body: createWorkspaceInvitationBodySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(CORE_PERMISSION.MEMBER_INVITE),
    enforceWorkspaceAccessMode(),
    authorizeRoleDelegation,
    create,
);

workspaceInvitationRouter.get(
    '/',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
        query: paginationQuerySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(CORE_PERMISSION.MEMBER_INVITE),
    list,
);

workspaceInvitationRouter.post(
    '/:invitationId/resend',
    authenticate,
    validateRequest({
        params: workspaceInvitationParamsSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(CORE_PERMISSION.MEMBER_INVITE),
    enforceWorkspaceAccessMode(),
    resend,
);

workspaceInvitationRouter.delete(
    '/:invitationId',
    authenticate,
    validateRequest({
        params: workspaceInvitationParamsSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(CORE_PERMISSION.MEMBER_INVITE),
    enforceWorkspaceAccessMode({
        allowDuringRemediation: true,
    }),
    revoke,
);

/**
 * L'acceptation ne passe pas par loadWorkspaceContext : l'utilisateur n'est
 * précisément pas encore membre du workspace au moment de la requête.
 */
const invitationAcceptanceRouter = Router();

invitationAcceptanceRouter.post(
    '/accept',
    authenticate,
    validateRequest({
        body: acceptWorkspaceInvitationBodySchema,
    }),
    accept,
);

export {
    invitationAcceptanceRouter,
    workspaceInvitationRouter,
};
