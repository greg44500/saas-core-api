import { Router } from 'express';

import { validateRequest } from '../../middlewares/validateRequest.js';
import { login, register } from './auth.controller.js';
import { loginSchema, registerSchema } from './auth.validation.js';

const router = Router();

/**
 * Inscription locale.
 *
 * La validation intervient avant le controller afin que celui-ci
 * ne reçoive que des données conformes au contrat HTTP.
 */
router.post(
    '/register',
    validateRequest({ body: registerSchema }),
    register,
);
/**
 * Authentification locale.
 */
router.post(
    '/login',
    validateRequest({ body: loginSchema }),
    login,
);

export { router as authRouter };