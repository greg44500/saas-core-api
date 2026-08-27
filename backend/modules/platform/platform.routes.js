import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { platformPlansRouter } from './plans/platformPlans.routes.js';
import { platformUsersRouter } from './users/platformUsers.routes.js';
import { platformWorkspacesRouter } from './workspaces/platformWorkspaces.routes.js';

const platformRouter = Router();

/**
 * L'authentification est une barrière commune à tout le périmètre Platform.
 * Les sous-routeurs restent responsables de leurs autorisations et validations.
 */
platformRouter.use(authenticate);

platformRouter.use('/users', platformUsersRouter);
platformRouter.use('/workspaces', platformWorkspacesRouter);
platformRouter.use('/plans', platformPlansRouter);

export { platformRouter };

import {
    platformSubscriptionsRouter,
} from './subscriptions/platformSubscriptions.routes.js';

platformRouter.use(
    '/subscriptions',
    platformSubscriptionsRouter,
);