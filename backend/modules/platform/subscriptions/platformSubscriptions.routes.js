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
    getSubscriptionById
} from './platformSubscriptions.controller.js';

import {
    platformSubscriptionIdParamsSchema,
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
 * Retourne le détail administratif d'une souscription.
 */
platformSubscriptionsRouter.get(
    '/:subscriptionId',
    validateRequest({
        params: platformSubscriptionIdParamsSchema,
    }),
    getSubscriptionById,
);


export {
    platformSubscriptionsRouter,
};