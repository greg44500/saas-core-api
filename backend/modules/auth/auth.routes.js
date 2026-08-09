import { Router } from 'express';

import { validateRequest } from '../../middlewares/validateRequest.js';
import { register } from './auth.controller.js';
import { registerSchema } from './auth.validation.js';

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

export { router as authRouter };