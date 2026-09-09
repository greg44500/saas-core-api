import { Router } from 'express';

import { authenticate } from '../../middlewares/authenticate.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import {
    getClosureImpact,
    requestClosure,
    updateMe,
} from './user.controller.js';
import {
    getMyPreferences,
    updateMyPreferences,
} from './userPreferences.controller.js';
import {
    requestCurrentUserClosureSchema,
    updateCurrentUserPreferencesSchema,
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
    '/me/preferences',
    authenticate,
    getMyPreferences,
);

userRouter.patch(
    '/me/preferences',
    authenticate,
    validateRequest({ body: updateCurrentUserPreferencesSchema }),
    updateMyPreferences,
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
