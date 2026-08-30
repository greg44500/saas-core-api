import { Router } from 'express';

import { authenticate } from '../../middlewares/authenticate.js';
import {
    platformAuditLogsRouter,
} from './auditLogs/platformAuditLogs.routes.js';
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

platformRouter.use('/users', platformUsersRouter);
platformRouter.use('/workspaces', platformWorkspacesRouter);
platformRouter.use('/plans', platformPlansRouter);
platformRouter.use('/subscriptions', platformSubscriptionsRouter);
platformRouter.use('/audit-logs', platformAuditLogsRouter);


export { platformRouter };
