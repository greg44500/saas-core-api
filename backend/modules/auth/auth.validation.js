import { z } from 'zod';

import {
    newPasswordSchema,
    passwordCredentialSchema,
    passwordSchema,
} from '../../shared/validation/password.validation.js';
import { userIdentityInputSchema } from '../users/user.validation.js';

/**
 * Réexporte la primitive de nouveau mot de passe afin de conserver l'API
 * existante du module Auth sans dupliquer la politique de sécurité.
 */
export { passwordSchema };

/**
 * Toute création de credential local doit respecter la politique canonique.
 */
export const registerSchema = userIdentityInputSchema.extend({
    password: newPasswordSchema,
});

/**
 * Le login accepte le credential courant sans lui réappliquer une politique
 * qui peut avoir été durcie depuis sa création.
 */
export const loginSchema = z.strictObject({
    email: z.email().max(254),
    password: passwordCredentialSchema,
});

/**
 * Seul le nouveau secret doit satisfaire la politique courante.
 */
export const changePasswordSchema = z.strictObject({
    currentPassword: passwordCredentialSchema,
    newPassword: newPasswordSchema,
});

export const forgotPasswordSchema = z.strictObject({
    email: z.email().max(254),
});

export const resetPasswordSchema = z.strictObject({
    token: z.string().min(1).max(256),
    newPassword: newPasswordSchema,
});
