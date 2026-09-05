import { Router } from 'express';

import {
    platformInvitationAcceptRateLimiter,
} from '../../config/platformInvitationRateLimit.config.js';
import {
    PLATFORM_PERMISSION,
} from '../../constants/platformPermissions.constants.js';
import { authenticate } from '../../middlewares/authenticate.js';
import {
    authorizePlatformPermission,
} from '../../middlewares/authorizePlatformPermission.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import {
    paginationQuerySchema,
} from '../../utils/validations/pagination.validation.js';
import {
    acceptExisting,
    acceptNew,
    create,
    list,
    resend,
    revoke,
} from './platformInvitation.controller.js';
import {
    acceptExistingPlatformInvitationBodySchema,
    acceptNewPlatformInvitationBodySchema,
    createPlatformInvitationBodySchema,
    platformInvitationIdParamsSchema,
} from './platformInvitation.validation.js';


/**
 * Routes administratives montées sous /api/platform/team.
 * Le routeur Platform racine assure déjà authenticate().
 */
const platformTeamInvitationRouter = Router();

platformTeamInvitationRouter.post(
    '/invitations',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.TEAM_INVITE,
    ),
    validateRequest({
        body: createPlatformInvitationBodySchema,
    }),
    create,
);

platformTeamInvitationRouter.get(
    '/invitations',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.TEAM_READ,
    ),
    validateRequest({
        query: paginationQuerySchema,
    }),
    list,
);

platformTeamInvitationRouter.post(
    '/invitations/:invitationId/resend',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.TEAM_INVITATION_RESEND,
    ),
    validateRequest({
        params: platformInvitationIdParamsSchema,
    }),
    resend,
);

platformTeamInvitationRouter.delete(
    '/invitations/:invitationId',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.TEAM_INVITATION_REVOKE,
    ),
    validateRequest({
        params: platformInvitationIdParamsSchema,
    }),
    revoke,
);


/**
 * L'acceptation est séparée du périmètre administratif : le destinataire n'est
 * précisément pas encore membre de l'équipe au moment de la requête.
 */
const platformInvitationAcceptanceRouter = Router();

platformInvitationAcceptanceRouter.post(
    '/accept-existing',
    platformInvitationAcceptRateLimiter,
    authenticate,
    validateRequest({
        body: acceptExistingPlatformInvitationBodySchema,
    }),
    acceptExisting,
);

platformInvitationAcceptanceRouter.post(
    '/accept-new',
    platformInvitationAcceptRateLimiter,
    validateRequest({
        body: acceptNewPlatformInvitationBodySchema,
    }),
    acceptNew,
);


export {
    platformInvitationAcceptanceRouter,
    platformTeamInvitationRouter,
};
