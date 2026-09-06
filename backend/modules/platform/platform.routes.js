import { Router } from 'express';

import { authenticate } from '../../middlewares/authenticate.js';
import {
    platformTeamInvitationRouter,
} from '../platformInvitation/platformInvitation.routes.js';
import {
    platformRoleRouter,
} from '../platformRole/platformRole.routes.js';
import {
    platformTeamRouter,
} from '../platformTeam/platformTeam.routes.js';
import {
    platformAuditLogsRouter,
} from './auditLogs/platformAuditLogs.routes.js';
import {
    platformCurrentContextRouter,
} from './currentContext/platformCurrentContext.routes.js';
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

platformRouter.use('/me', platformCurrentContextRouter);
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
platformRouter.use('/team/roles', platformRoleRouter);
platformRouter.use('/team', platformTeamRouter);
platformRouter.use('/team', platformTeamInvitationRouter);


export { platformRouter };
