import { Router } from 'express';

import {
    PLATFORM_PERMISSION,
} from '../../../constants/platformPermissions.constants.js';
import {
    authorizePlatformPermission,
} from '../../../middlewares/authorizePlatformPermission.js';
import {
    validateRequest,
} from '../../../middlewares/validateRequest.js';
import { getOverview } from './platformOverview.controller.js';
import {
    platformOverviewQuerySchema,
} from './platformOverview.validation.js';

const platformOverviewRouter = Router();

/**
 * La lecture du cockpit Platform possède sa permission propre. Elle ne dépend
 * pas du cumul artificiel de toutes les permissions de détail (users,
 * subscriptions, audit, etc.), ce qui permettra plus tard des rôles Platform
 * d'observation sans leur ouvrir chaque ressource administrative.
 */
platformOverviewRouter.get(
    '/',
    authorizePlatformPermission(
        PLATFORM_PERMISSION.OVERVIEW_READ,
    ),
    validateRequest({
        query: platformOverviewQuerySchema,
    }),
    getOverview,
);

export { platformOverviewRouter };
