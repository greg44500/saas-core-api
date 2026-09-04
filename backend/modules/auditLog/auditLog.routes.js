import { Router } from 'express';

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorizePermission } from '../../middlewares/authorizePermission.js';
import { enforcePlanFeature } from '../../middlewares/enforcePlanFeature.js';
import { loadWorkspaceContext } from '../../middlewares/loadWorkspaceContext.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import {
    CORE_PLAN_FEATURE,
} from '../plan/planCapability.registry.js';
import {
    workspaceIdParamsSchema,
} from '../workspace/workspace.validation.js';
import {
    listWorkspaceAuditLogEntries,
} from './auditLog.controller.js';
import {
    workspaceAuditLogQuerySchema,
} from './auditLog.validation.js';


const router = Router({
    mergeParams: true,
});


/**
 * La production des AuditLogs reste un invariant de sécurité du Core. Seule
 * leur consultation tenant est une capability commerciale. Cette lecture reste
 * possible pendant une remédiation lorsque audit_logs est effectivement actif.
 */
router.get(
    '/',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
        query: workspaceAuditLogQuerySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        CORE_PERMISSION.AUDIT_READ,
    ),
    enforcePlanFeature(
        CORE_PLAN_FEATURE.AUDIT_LOGS,
    ),
    listWorkspaceAuditLogEntries,
);


export { router as auditLogRouter };
