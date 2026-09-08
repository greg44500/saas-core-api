import { Router } from 'express';

import {
    commercialInvitationRateLimiter,
} from '../../config/commercialInvitationRateLimit.config.js';
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
    accept,
    create,
    list,
    listOffers,
    preview,
    resend,
    revoke,
} from './commercialInvitation.controller.js';
import {
    acceptCommercialInvitationBodySchema,
    commercialInvitationIdParamsSchema,
    createCommercialInvitationBodySchema,
    previewCommercialInvitationBodySchema,
    revokeCommercialInvitationBodySchema,
} from './commercialInvitation.validation.js';

/**
 * Administration Platform. L'authentification est assurée par le routeur
 * `/api/platform`; chaque action possède néanmoins sa permission dédiée.
 */
const platformCommercialInvitationRouter = Router();

platformCommercialInvitationRouter.get(
    '/offers',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.COMMERCIAL_INVITATIONS_CREATE,
    ),
    listOffers,
);

platformCommercialInvitationRouter.post(
    '/',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.COMMERCIAL_INVITATIONS_CREATE,
    ),
    validateRequest({ body: createCommercialInvitationBodySchema }),
    create,
);

platformCommercialInvitationRouter.get(
    '/',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.COMMERCIAL_INVITATIONS_READ,
    ),
    validateRequest({ query: paginationQuerySchema }),
    list,
);

platformCommercialInvitationRouter.post(
    '/:invitationId/resend',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.COMMERCIAL_INVITATIONS_RESEND,
    ),
    validateRequest({ params: commercialInvitationIdParamsSchema }),
    resend,
);

platformCommercialInvitationRouter.post(
    '/:invitationId/revoke',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.COMMERCIAL_INVITATIONS_REVOKE,
    ),
    validateRequest({
        params: commercialInvitationIdParamsSchema,
        body: revokeCommercialInvitationBodySchema,
    }),
    revoke,
);

/**
 * Parcours destinataire. `preview` reste public mais rate-limité et reçoit le
 * secret dans le body, jamais dans le path. `accept` exige en plus Auth afin que
 * le token ne puisse pas choisir l'identité bénéficiaire.
 */
const commercialInvitationAcceptanceRouter = Router();

commercialInvitationAcceptanceRouter.post(
    '/preview',
    commercialInvitationRateLimiter,
    validateRequest({ body: previewCommercialInvitationBodySchema }),
    preview,
);

commercialInvitationAcceptanceRouter.post(
    '/accept',
    commercialInvitationRateLimiter,
    authenticate,
    validateRequest({ body: acceptCommercialInvitationBodySchema }),
    accept,
);

export {
    commercialInvitationAcceptanceRouter,
    platformCommercialInvitationRouter,
};
