import { Router } from 'express';

import { authenticate } from '../../middlewares/authenticate.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import { updateMe } from './user.controller.js';
import { updateCurrentUserProfileSchema } from './user.validation.js';

const userRouter = Router();

userRouter.patch(
    '/me',
    authenticate,
    validateRequest({ body: updateCurrentUserProfileSchema }),
    updateMe,
);

export { userRouter };
