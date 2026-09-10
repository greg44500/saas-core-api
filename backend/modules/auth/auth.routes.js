import { Router } from 'express';
import {
    forgotPasswordEmailRateLimiter,
    forgotPasswordIpRateLimiter,
    loginEmailRateLimiter,
    loginIpRateLimiter,
} from '../../config/rateLimit.config.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { validateRequest } from '../../middlewares/validateRequest.js';
import {
    changePassword,
    forgotPassword,
    login,
    logout,
    logoutAll,
    me,
    passwordPolicy,
    refresh,
    register,
    resetPassword,
} from './auth.controller.js';
import {
    changePasswordSchema,
    forgotPasswordSchema,
    loginSchema,
    registerSchema,
    resetPasswordSchema,
} from './auth.validation.js';

const router = Router();

router.get('/password-policy', passwordPolicy);

router.post(
    '/register',
    validateRequest({ body: registerSchema }),
    register,
);

router.post(
    '/login',
    loginIpRateLimiter,
    loginEmailRateLimiter,
    validateRequest({ body: loginSchema }),
    login,
);

router.post(
    '/forgot-password',
    forgotPasswordIpRateLimiter,
    forgotPasswordEmailRateLimiter,
    validateRequest({ body: forgotPasswordSchema }),
    forgotPassword,
);

router.post(
    '/reset-password',
    validateRequest({ body: resetPasswordSchema }),
    resetPassword,
);

router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/logout-all', authenticate, logoutAll);

router.post(
    '/change-password',
    authenticate,
    validateRequest({ body: changePasswordSchema }),
    changePassword,
);

router.get('/me', authenticate, me);

export { router as authRouter };
