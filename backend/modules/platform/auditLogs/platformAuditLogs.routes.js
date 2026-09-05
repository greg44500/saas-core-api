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
    listAuditLogs,
} from './platformAuditLogs.controller.js';
import {
    platformAuditLogQuerySchema,
} from './platformAuditLogs.validation.js';


const platformAuditLogsRouter = Router();

platformAuditLogsRouter.get(
    '/',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.AUDIT_LOGS_READ,
    ),
    validateRequest({
        query: platformAuditLogQuerySchema,
    }),
    listAuditLogs,
);


export {
    platformAuditLogsRouter,
};
