import { Router } from 'express';

import { authenticate } from '../../middlewares/authenticate.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import {
    getClosureImpact,
    requestClosure,
    updateMe,
} from './user.controller.js';
import {
    requestCurrentUserClosureSchema,
    updateCurrentUserProfileSchema,
} from './user.validation.js';

const userRouter = Router();

userRouter.patch(
    '/me',
    authenticate,
    validateRequest({ body: updateCurrentUserProfileSchema }),
    updateMe,
);

userRouter.get(
    '/me/closure-impact',
    authenticate,
    getClosureImpact,
);

userRouter.post(
    '/me/closure',
    authenticate,
    validateRequest({ body: requestCurrentUserClosureSchema }),
    requestClosure,
);

export { userRouter };
