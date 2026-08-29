import { Router } from 'express';

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorizePermission } from '../../middlewares/authorizePermission.js';
import { authorizeWorkspaceOwner } from '../../middlewares/authorizeWorkspaceOwner.js';
import { loadWorkspaceContext } from '../../middlewares/loadWorkspaceContext.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import {
    endTrialToFree,
    getWorkspaceOverview,
    grantTrial,
    resumeCancellation,
    revokeDowngrade,
    scheduleCancellation,
    scheduleDowngrade,
} from './subscription.controller.js';
import {
    grantTrialBodySchema,
    scheduleCancellationBodySchema,
    scheduleDowngradeBodySchema,
    workspaceIdParamsSchema,
    workspaceSubscriptionParamsSchema,
} from './subscription.validation.js';

const router = Router({
    mergeParams: true,
});

/**
 * Cette lecture reste disponible pendant une remédiation afin que l'interface
 * puisse expliquer le plan effectif et la mise en conformité éventuelle.
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

/**
 * Les commandes commerciales sont réservées au propriétaire. Cette barrière
 * n'est pas une permission délégable : un admin peut administrer le tenant sans
 * pouvoir engager ou résilier le contrat commercial de son propriétaire.
 */
router.post(
    '/trial',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
        body: grantTrialBodySchema,
    }),
    loadWorkspaceContext,
    authorizeWorkspaceOwner,
    grantTrial,
);

router.post(
    '/trial/end-to-free',
    authenticate,
    validateRequest({
        params: workspaceIdParamsSchema,
    }),
    loadWorkspaceContext,
    authorizeWorkspaceOwner,
    endTrialToFree,
);

router.post(
    '/:subscriptionId/cancellation',
    authenticate,
    validateRequest({
        params: workspaceSubscriptionParamsSchema,
        body: scheduleCancellationBodySchema,
    }),
    loadWorkspaceContext,
    authorizeWorkspaceOwner,
    scheduleCancellation,
);

router.delete(
    '/:subscriptionId/cancellation',
    authenticate,
    validateRequest({
        params: workspaceSubscriptionParamsSchema,
    }),
    loadWorkspaceContext,
    authorizeWorkspaceOwner,
    resumeCancellation,
);

router.post(
    '/:subscriptionId/downgrade',
    authenticate,
    validateRequest({
        params: workspaceSubscriptionParamsSchema,
        body: scheduleDowngradeBodySchema,
    }),
    loadWorkspaceContext,
    authorizeWorkspaceOwner,
    scheduleDowngrade,
);

router.delete(
    '/:subscriptionId/downgrade',
    authenticate,
    validateRequest({
        params: workspaceSubscriptionParamsSchema,
    }),
    loadWorkspaceContext,
    authorizeWorkspaceOwner,
    revokeDowngrade,
);

export { router as subscriptionRouter };
