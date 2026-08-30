import { Router } from 'express';

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorizePermission } from '../../middlewares/authorizePermission.js';
import {
    enforceWorkspaceAccessMode,
} from '../../middlewares/enforceWorkspaceAccessMode.js';
import { loadWorkspaceContext } from '../../middlewares/loadWorkspaceContext.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import {
    auditLogRouter,
} from '../auditLog/auditLog.routes.js';
import {
    subscriptionRouter,
} from '../subscriptions/subscription.routes.js';
import {
    workspaceMemberRouter,
} from '../workspaceMember/workspaceMember.routes.js';

import {
    create,
    getById,
    list,
    listMembers,
    update,
} from './workspace.controller.js';

import {
    createWorkspaceSchema,
    updateWorkspaceSchema,
    workspaceIdParamsSchema,
} from './workspace.validation.js';

import {
    paginationQuerySchema,
} from '../../utils/validations/pagination.validation.js';

const router = Router();

router.post(
    '/',
    authenticate,
    validateRequest({
        body: createWorkspaceSchema,
    }),
    create,
);

router.get(
    '/',
    authenticate,
    list,
);

/**
 * Le module Subscription reste responsable de sa propre chaîne HTTP. Le
 * workspaceRouter ne fait ici que porter la frontière multi-tenant commune.
 */
router.use(
    '/:workspaceId/subscription',
    subscriptionRouter,
);

/**
 * AuditLog porte sa propre politique de lecture. Le routeur workspace ne fait
 * que fournir le segment tenant commun à cette API transversale.
 */
router.use(
    '/:workspaceId/audit-logs',
    auditLogRouter,
);

/**
 * Les commandes individuelles des membres appartiennent au module
 * WorkspaceMember. La collection reste lue depuis Workspace afin de préserver
 * le contrat de pagination déjà exposé.
 */
router.use(
    '/:workspaceId/members',
    workspaceMemberRouter,
);

/**
 * Les lectures restent accessibles en remédiation afin que l'interface puisse
 * expliquer la situation et présenter les ressources à mettre en conformité.
 */
router.get(
    '/:workspaceId/members',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
        query: paginationQuerySchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        CORE_PERMISSION.MEMBER_READ,
    ),
    listMembers,
);

router.get(
    '/:workspaceId',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        CORE_PERMISSION.WORKSPACE_READ,
    ),
    getById,
);

/**
 * Une modification générale du workspace n'est pas une action de remédiation.
 * Elle reste donc indisponible tant que des capacités bloquantes dépassent le
 * plan effectif. Les futures routes de correction déclareront explicitement
 * leur autorisation en remédiation.
 */
router.patch(
    '/:workspaceId',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
        body: updateWorkspaceSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        CORE_PERMISSION.WORKSPACE_UPDATE,
    ),
    enforceWorkspaceAccessMode(),
    update,
);

export { router as workspaceRouter };
