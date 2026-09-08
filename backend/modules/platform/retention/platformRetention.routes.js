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
    createRetentionPolicyVersion,
    executeRetentionManually,
    getRetentionState,
    listRetentionExecutions,
    listRetentionTargets,
    previewRetention,
} from './platformRetention.controller.js';
import {
    createRetentionPolicyVersionBodySchema,
    executeRetentionPolicyBodySchema,
    platformRetentionTargetParamsSchema,
} from './platformRetention.validation.js';


const platformRetentionRouter = Router();

platformRetentionRouter.get(
    '/',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.RETENTION_READ,
    ),
    listRetentionTargets,
);

platformRetentionRouter.get(
    '/:targetKey',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.RETENTION_READ,
    ),
    validateRequest({
        params: platformRetentionTargetParamsSchema,
    }),
    getRetentionState,
);

platformRetentionRouter.get(
    '/:targetKey/executions',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.RETENTION_READ,
    ),
    validateRequest({
        params: platformRetentionTargetParamsSchema,
        query: paginationQuerySchema,
    }),
    listRetentionExecutions,
);

platformRetentionRouter.post(
    '/:targetKey/preview',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.RETENTION_PREVIEW,
    ),
    validateRequest({
        params: platformRetentionTargetParamsSchema,
    }),
    previewRetention,
);

platformRetentionRouter.post(
    '/:targetKey/policy-versions',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.RETENTION_UPDATE,
    ),
    validateRequest({
        params: platformRetentionTargetParamsSchema,
        body: createRetentionPolicyVersionBodySchema,
    }),
    createRetentionPolicyVersion,
);

platformRetentionRouter.post(
    '/:targetKey/executions',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.RETENTION_EXECUTE,
    ),
    validateRequest({
        params: platformRetentionTargetParamsSchema,
        body: executeRetentionPolicyBodySchema,
    }),
    executeRetentionManually,
);


export { platformRetentionRouter };
