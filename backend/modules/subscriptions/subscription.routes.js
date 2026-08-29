import { Router } from 'express';

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorizePermission } from '../../middlewares/authorizePermission.js';
import { loadWorkspaceContext } from '../../middlewares/loadWorkspaceContext.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import {
    workspaceIdParamsSchema,
} from '../workspace/workspace.validation.js';

import { getWorkspaceOverview } from './subscription.controller.js';

const router = Router({
    mergeParams: true,
});

/**
 * Cette lecture reste disponible pendant une remédiation : elle permet au
 * frontend d'expliquer le plan effectif, l'état contractuel et les limites à
 * remettre en conformité. Aucun middleware de blocage des mutations n'est donc
 * appliqué ici.
 *
 * Le DTO retourné ne contient aucune donnée de paiement ou de facturation.
 */
router.get(
    '/',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
    }),
    loadWorkspaceContext,
    authorizePermission(
        CORE_PERMISSION.SUBSCRIPTION_READ,
    ),
    getWorkspaceOverview,
);

export { router as subscriptionRouter };