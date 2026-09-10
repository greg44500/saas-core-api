import { z } from 'zod';

import {
    newPasswordSchema,
    passwordCredentialSchema,
    passwordSchema,
} from '../../shared/validation/password.validation.js';
import { userIdentityInputSchema } from '../users/user.validation.js';

export { passwordSchema };

export const registerSchema = userIdentityInputSchema.extend({
    password: newPasswordSchema,
    legalAccepted: z.literal(true),
});

export const loginSchema = z.strictObject({
    email: z.email().max(254),
    password: passwordCredentialSchema,
});

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
