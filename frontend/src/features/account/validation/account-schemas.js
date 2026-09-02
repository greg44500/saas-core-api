import { z } from 'zod';

import { passwordSchema } from '@/features/auth/validation/auth-schemas';

const nameSchema = z.string().trim().min(1, 'Ce champ est requis.').max(100, 'Ce champ est trop long.');

const profileSchema = z.strictObject({
  firstName: nameSchema,
  lastName: nameSchema,
});

const changePasswordFormSchema = z
  .strictObject({
    currentPassword: passwordSchema,
    newPassword: passwordSchema,
    confirmNewPassword: passwordSchema,
  })
  .refine((values) => values.newPassword === values.confirmNewPassword, {
    message: 'Les nouveaux mots de passe ne correspondent pas.',
    path: ['confirmNewPassword'],
  });

export { changePasswordFormSchema, profileSchema };
