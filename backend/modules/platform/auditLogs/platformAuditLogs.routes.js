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
    listAuditLogs,
} from './platformAuditLogs.controller.js';
import {
    platformAuditLogQuerySchema,
} from './platformAuditLogs.validation.js';


const platformAuditLogsRouter = Router();

/**
 * La consultation globale des événements d'audit est réservée au super-admin
 * dans la V1. Le routeur Platform racine assure déjà l'authentification.
 */
platformAuditLogsRouter.use(
    authorizePlatformRole(
        PLATFORM_ROLE.SUPER_ADMIN,
    ),
);

platformAuditLogsRouter.get(
    '/',
    validateRequest({
        query: platformAuditLogQuerySchema,
    }),
    listAuditLogs,
);


export {
    platformAuditLogsRouter,
};
