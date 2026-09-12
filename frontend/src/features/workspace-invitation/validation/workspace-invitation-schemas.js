import { z } from 'zod';

import { newPasswordFormValueSchema } from '@/features/auth/validation/auth-schemas';

const workspaceInvitationTokenSchema = z
  .string()
  .regex(/^[a-f\d]{64}$/i, 'Invitation invalide.');

const workspaceInvitationNewAccountSchema = z
  .strictObject({
    firstName: z.string().trim().min(1, 'Le prénom est requis.').max(100, 'Le prénom est trop long.'),
    lastName: z.string().trim().min(1, 'Le nom est requis.').max(100, 'Le nom est trop long.'),
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
  workspaceInvitationNewAccountSchema,
  workspaceInvitationTokenSchema,
};
