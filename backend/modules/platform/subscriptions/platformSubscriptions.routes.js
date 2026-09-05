import { Router } from 'express';

import {
    PLATFORM_PERMISSION,
} from '../../../constants/platformPermissions.constants.js';
import {
    authorizePlatformPermission,
} from '../../../middlewares/authorizePlatformPermission.js';
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

platformSubscriptionsRouter.get(
    '/',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.SUBSCRIPTIONS_READ,
    ),
    validateRequest({
        query: paginationQuerySchema,
    }),
    listSubscriptions,
);

platformSubscriptionsRouter.post(
    '/grant-trial',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.SUBSCRIPTIONS_GRANT_TRIAL,
    ),
    validateRequest({
        body: grantTrialBodySchema,
    }),
    grantSubscriptionTrial,
);

platformSubscriptionsRouter.get(
    '/:subscriptionId',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.SUBSCRIPTIONS_READ,
    ),
    validateRequest({
        params: platformSubscriptionIdParamsSchema,
    }),
    getSubscriptionById,
);

platformSubscriptionsRouter.patch(
    '/:subscriptionId',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.SUBSCRIPTIONS_UPDATE,
    ),
    validateRequest({
        params:
            platformSubscriptionIdParamsSchema,
        body:
            updatePlatformSubscriptionBodySchema,
    }),
    updateSubscription,
);

platformSubscriptionsRouter.patch(
    '/:subscriptionId/cancel',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.SUBSCRIPTIONS_CANCEL,
    ),
    validateRequest({
        params:
            platformSubscriptionIdParamsSchema,
        body:
            cancelPlatformSubscriptionBodySchema,
    }),
    cancelSubscription,
);

platformSubscriptionsRouter.patch(
    '/:subscriptionId/resume',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.SUBSCRIPTIONS_RESUME,
    ),
    validateRequest({
        params:
            platformSubscriptionIdParamsSchema,
    }),
    resumeSubscription,
);


export {
    platformSubscriptionsRouter,
};
