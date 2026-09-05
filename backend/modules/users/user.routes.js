import { Router } from 'express';

import { authenticate } from '../../middlewares/authenticate.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import {
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

userRouter.post(
    '/me/closure',
    authenticate,
    validateRequest({ body: requestCurrentUserClosureSchema }),
    requestClosure,
);

export { userRouter };
