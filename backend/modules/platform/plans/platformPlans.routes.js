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
    listPlanCapabilities,
} from './platformPlanCapabilities.controller.js';

import {
    archivePlan,
    createPlan,
    listPlans,
    updatePlan,
} from './platformPlans.controller.js';

import {
    createPlatformPlanBodySchema,
    platformPlanIdParamsSchema,
    updatePlatformPlanBodySchema,
} from './platformPlans.validation.js';


const platformPlansRouter = Router();


/**
 * Les routes expriment maintenant l'action Platform réellement requise.
 * La politique Core V1 attribue toutes ces permissions uniquement au
 * super-admin, donc cette migration n'élargit aucun accès existant.
 */
platformPlansRouter.get(
    '/capabilities',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.CAPABILITIES_READ,
    ),
    listPlanCapabilities,
);

platformPlansRouter.get(
    '/',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.PLANS_READ,
    ),
    validateRequest({
        query: paginationQuerySchema,
    }),
    listPlans,
);

platformPlansRouter.post(
    '/',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.PLANS_CREATE,
    ),
    validateRequest({
        body: createPlatformPlanBodySchema,
    }),
    createPlan,
);

platformPlansRouter.patch(
    '/:planId',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.PLANS_UPDATE,
    ),
    validateRequest({
        params: platformPlanIdParamsSchema,
        body: updatePlatformPlanBodySchema,
    }),
    updatePlan,
);

platformPlansRouter.patch(
    '/:planId/archive',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.PLANS_ARCHIVE,
    ),
    validateRequest({
        params: platformPlanIdParamsSchema,
    }),
    archivePlan,
);


export {
    platformPlansRouter,
};
