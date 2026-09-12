import { Router } from 'express';

import {
    workspaceInvitationAcceptRateLimiter,
} from '../../config/workspaceInvitationRateLimit.config.js';
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
    paginationQuerySchema,
} from '../../utils/validations/pagination.validation.js';
import {
    CORE_PLAN_FEATURE,
} from '../plan/planCapability.registry.js';
import {
    accept,
    acceptNew,
    create,
    list,
    resend,
    revoke,
} from './workspaceInvitation.controller.js';
import {
    acceptNewWorkspaceInvitationBodySchema,
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
    enforcePlanFeature(CORE_PLAN_FEATURE.TEAM_MANAGEMENT),
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
    enforcePlanFeature(CORE_PLAN_FEATURE.TEAM_MANAGEMENT),
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
    enforcePlanFeature(CORE_PLAN_FEATURE.TEAM_MANAGEMENT),
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
    enforcePlanFeature(CORE_PLAN_FEATURE.TEAM_MANAGEMENT),
    revoke,
);

/**
 * L'acceptation ne passe pas par loadWorkspaceContext : le destinataire n'est
 * précisément pas encore membre du workspace. Le chemin existant exige une
 * session ; le chemin new crée le compte et le membership atomiquement.
 *
 * Le limiter IP s'exécute avant authentification/validation pour que les
 * requêtes invalides participent elles aussi à la protection anti-automation.
 */
const invitationAcceptanceRouter = Router();

invitationAcceptanceRouter.post(
    '/accept',
    workspaceInvitationAcceptRateLimiter,
    authenticate,
    validateRequest({
        body: acceptWorkspaceInvitationBodySchema,
    }),
    accept,
);

invitationAcceptanceRouter.post(
    '/accept-new',
    workspaceInvitationAcceptRateLimiter,
    validateRequest({
        body: acceptNewWorkspaceInvitationBodySchema,
    }),
    acceptNew,
);

export {
    invitationAcceptanceRouter,
    workspaceInvitationRouter,
};
