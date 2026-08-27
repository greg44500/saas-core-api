import { Router } from 'express';

import {
    PLATFORM_ROLE,
} from '../../../constants/platformRoles.constants.js';
import {
    authorizePlatformRole,
} from '../../../middlewares/authorizePlatformRole.js';
import {
    validateRequest,
} from '../../../middlewares/validateRequest.js';
import {
    paginationQuerySchema,
} from '../../../utils/validations/pagination.validation.js';
import {
    listPlans,
} from './platformPlans.controller.js';


const platformPlansRouter = Router();

platformPlansRouter.get(
    '/',
    authorizePlatformRole(PLATFORM_ROLE.SUPER_ADMIN),
    validateRequest({ query: paginationQuerySchema }),
    listPlans,
);


export { platformPlansRouter };
