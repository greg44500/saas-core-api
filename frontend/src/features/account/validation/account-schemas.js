import { z } from 'zod';

import {
  emailSchema,
  passwordSchema,
} from '@/features/auth/validation/auth-schemas';

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

const accountClosureFormSchema = z.strictObject({
  currentPassword: passwordSchema,
  confirmationEmail: emailSchema,
  confirmAccountClosure: z.boolean().refine((value) => value === true, {
    message: 'Vous devez confirmer explicitement la fermeture du compte.',
  }),
});

export {
  accountClosureFormSchema,
  changePasswordFormSchema,
  profileSchema,
};
