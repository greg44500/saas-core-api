import { Router } from 'express';

import { authenticate } from '../../middlewares/authenticate.js';
import { loadWorkspaceContext } from '../../middlewares/loadWorkspaceContext.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import {
    getPlatformHelpEntry,
    getWorkspaceHelpEntry,
    listPlatformHelp,
    listWorkspaceHelp,
} from './help.controller.js';
import {
    platformHelpEntryParamsSchema,
    workspaceHelpEntryParamsSchema,
    workspaceHelpParamsSchema,
} from './help.validation.js';


const workspaceHelpRouter = Router({ mergeParams: true });

workspaceHelpRouter.get(
    '/',
    authenticate,
    validateRequest({ params: workspaceHelpParamsSchema }),
    loadWorkspaceContext,
    listWorkspaceHelp,
);

workspaceHelpRouter.get(
    '/:entryId',
    authenticate,
    validateRequest({ params: workspaceHelpEntryParamsSchema }),
    loadWorkspaceContext,
    getWorkspaceHelpEntry,
);

/*
 * Le parent /api/platform applique déjà authenticate. Le service Help recharge
 * ensuite l'autorité Platform réelle afin de filtrer le corpus avant toute
 * sérialisation et de ne jamais transformer le frontend en barrière de sécurité.
 */
const platformHelpRouter = Router();

platformHelpRouter.get('/', listPlatformHelp);
platformHelpRouter.get(
    '/:entryId',
    validateRequest({ params: platformHelpEntryParamsSchema }),
    getPlatformHelpEntry,
);


export {
    platformHelpRouter,
    workspaceHelpRouter,
};
