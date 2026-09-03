import { Router } from 'express';

import { authenticate } from '../../middlewares/authenticate.js';
import {
    platformAuditLogsRouter,
} from './auditLogs/platformAuditLogs.routes.js';
import {
    platformEntitlementOverridesRouter,
} from './entitlementOverrides/platformEntitlementOverrides.routes.js';
import {
    platformOverviewRouter,
} from './overview/platformOverview.routes.js';
import { platformPlansRouter } from './plans/platformPlans.routes.js';
import {
    platformSubscriptionsRouter,
} from './subscriptions/platformSubscriptions.routes.js';
import { platformUsersRouter } from './users/platformUsers.routes.js';
import {
    platformWorkspacesRouter,
} from './workspaces/platformWorkspaces.routes.js';


const platformRouter = Router();

/**
 * L'authentification est une barrière commune à tout le périmètre Platform.
 * Les sous-routeurs restent responsables de leurs autorisations et validations.
 */
platformRouter.use(authenticate);

platformRouter.use('/overview', platformOverviewRouter);
platformRouter.use('/users', platformUsersRouter);
platformRouter.use('/workspaces', platformWorkspacesRouter);
platformRouter.use('/plans', platformPlansRouter);
platformRouter.use('/subscriptions', platformSubscriptionsRouter);
platformRouter.use(
    '/entitlement-overrides',
    platformEntitlementOverridesRouter,
);
platformRouter.use('/audit-logs', platformAuditLogsRouter);


export { platformRouter };
