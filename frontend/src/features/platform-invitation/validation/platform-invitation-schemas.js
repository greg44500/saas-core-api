import { z } from 'zod';

import { newPasswordFormValueSchema } from '@/features/auth/validation/auth-schemas';

const platformInvitationTokenSchema = z
  .string()
  .trim()
  .length(64, 'Lien d’invitation invalide.')
  .regex(/^[a-f\d]{64}$/i, 'Lien d’invitation invalide.');

const platformInvitationNewAccountSchema = z
  .strictObject({
    password: newPasswordFormValueSchema,
    confirmPassword: newPasswordFormValueSchema,
    legalAccepted: z.boolean().refine((value) => value === true, {
      message: 'Vous devez accepter les conditions et reconnaître avoir pris connaissance de la politique de confidentialité.',
    }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas.',
    path: ['confirmPassword'],
  });

export {
  platformInvitationNewAccountSchema,
  platformInvitationTokenSchema,
};
