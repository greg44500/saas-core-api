import { Router } from 'express';

import {
    PLATFORM_ROLE,
} from '../../../constants/platformRoles.constants.js';

import {
    authorizePlatformRole,
} from '../../../middlewares/authorizePlatformRole.js';

import {
    validateRequest,
} from '../../../middlewares/validateRequest.js';

import {
    paginationQuerySchema,
} from '../../../utils/validations/pagination.validation.js';

import {
    listSubscriptions,
    grantSubscriptionTrial,
    getSubscriptionById,
    updateSubscription,
    cancelSubscription,
    resumeSubscription,
} from './platformSubscriptions.controller.js';

import {
    cancelPlatformSubscriptionBodySchema,
    grantTrialBodySchema,
    platformSubscriptionIdParamsSchema,
    updatePlatformSubscriptionBodySchema,
} from './platformSubscriptions.validation.js';


const platformSubscriptionsRouter = Router();


/**
 * Toutes les routes d'administration des souscriptions sont réservées
 * au super-admin dans la V1.
 */
platformSubscriptionsRouter.use(
    authorizePlatformRole(
        PLATFORM_ROLE.SUPER_ADMIN,
    ),
);


/**
 * Retourne la liste administrative paginée des souscriptions.
 */
platformSubscriptionsRouter.get(
    '/',
    validateRequest({
        query: paginationQuerySchema,
    }),
    listSubscriptions,
);


/**
 * Accorde un trial commercial ou change le plan d'un trial déjà actif.
 *
 * Cette route est déclarée avant `/:subscriptionId` afin que `grant-trial`
 * ne puisse jamais être interprété comme un identifiant de souscription.
 */
platformSubscriptionsRouter.post(
    '/grant-trial',
    validateRequest({
        body: grantTrialBodySchema,
    }),
    grantSubscriptionTrial,
);


/**
 * Retourne le détail administratif d'une souscription.
 */
platformSubscriptionsRouter.get(
    '/:subscriptionId',
    validateRequest({
        params: platformSubscriptionIdParamsSchema,
    }),
    getSubscriptionById,
);


/**
 * Met à jour les propriétés administratives autorisées d'une souscription.
 */
platformSubscriptionsRouter.patch(
    '/:subscriptionId',
    validateRequest({
        params:
            platformSubscriptionIdParamsSchema,
        body:
            updatePlatformSubscriptionBodySchema,
    }),
    updateSubscription,
);


/**
 * Annule une souscription immédiatement ou à la fin de sa période courante.
 */
platformSubscriptionsRouter.patch(
    '/:subscriptionId/cancel',
    validateRequest({
        params:
            platformSubscriptionIdParamsSchema,
        body:
            cancelPlatformSubscriptionBodySchema,
    }),
    cancelSubscription,
);


/**
 * Retire une annulation programmée en fin de période.
 */
platformSubscriptionsRouter.patch(
    '/:subscriptionId/resume',
    validateRequest({
        params:
            platformSubscriptionIdParamsSchema,
    }),
    resumeSubscription,
);


export {
    platformSubscriptionsRouter,
};
