import { Router } from 'express';

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorizePermission } from '../../middlewares/authorizePermission.js';
import { loadWorkspaceContext } from '../../middlewares/loadWorkspaceContext.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
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
 * La consultation de l'audit reste disponible pendant une remédiation : elle
 * aide les administrateurs à comprendre les événements ayant conduit à l'état
 * courant du workspace sans autoriser pour autant une action de modification.
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
    listWorkspaceAuditLogEntries,
);


export { router as auditLogRouter };
