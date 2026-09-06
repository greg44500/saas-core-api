import { z } from 'zod';

import { passwordSchema } from '@/features/auth/validation/auth-schemas';

const platformInvitationTokenSchema = z
  .string()
  .trim()
  .length(64, 'Lien d’invitation invalide.')
  .regex(/^[a-f\d]{64}$/i, 'Lien d’invitation invalide.');

const platformInvitationNewAccountSchema = z
  .strictObject({
    password: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas.',
    path: ['confirmPassword'],
  });

export {
  platformInvitationNewAccountSchema,
  platformInvitationTokenSchema,
};
