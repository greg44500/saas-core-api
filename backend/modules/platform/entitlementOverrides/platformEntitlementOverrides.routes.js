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
    createEntitlementOverride,
    getEntitlementOverrideById,
    listEntitlementOverrides,
    revokeEntitlementOverride,
    updateEntitlementOverride,
} from './platformEntitlementOverrides.controller.js';
import {
    createPlatformEntitlementOverrideBodySchema,
    listPlatformEntitlementOverridesQuerySchema,
    platformEntitlementOverrideIdParamsSchema,
    revokePlatformEntitlementOverrideBodySchema,
    updatePlatformEntitlementOverrideBodySchema,
} from './platformEntitlementOverrides.validation.js';


const platformEntitlementOverridesRouter = Router();

/**
 * Chaque route exprime l'action Platform exacte requise. La politique Core V1
 * attribue actuellement ces permissions au seul `super_admin`, sans coupler
 * les routes à un rôle particulier.
 */
platformEntitlementOverridesRouter.get(
    '/',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.ENTITLEMENT_OVERRIDES_READ,
    ),
    validateRequest({
        query: listPlatformEntitlementOverridesQuerySchema,
    }),
    listEntitlementOverrides,
);

platformEntitlementOverridesRouter.get(
    '/:overrideId',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.ENTITLEMENT_OVERRIDES_READ,
    ),
    validateRequest({
        params: platformEntitlementOverrideIdParamsSchema,
    }),
    getEntitlementOverrideById,
);

platformEntitlementOverridesRouter.post(
    '/',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.ENTITLEMENT_OVERRIDES_CREATE,
    ),
    validateRequest({
        body: createPlatformEntitlementOverrideBodySchema,
    }),
    createEntitlementOverride,
);

platformEntitlementOverridesRouter.patch(
    '/:overrideId',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.ENTITLEMENT_OVERRIDES_UPDATE,
    ),
    validateRequest({
        params: platformEntitlementOverrideIdParamsSchema,
        body: updatePlatformEntitlementOverrideBodySchema,
    }),
    updateEntitlementOverride,
);

platformEntitlementOverridesRouter.patch(
    '/:overrideId/revoke',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.ENTITLEMENT_OVERRIDES_REVOKE,
    ),
    validateRequest({
        params: platformEntitlementOverrideIdParamsSchema,
        body: revokePlatformEntitlementOverrideBodySchema,
    }),
    revokeEntitlementOverride,
);


export {
    platformEntitlementOverridesRouter,
};
