import { z } from 'zod';

const emailSchema = z.email('Adresse email invalide.').max(254, 'Adresse email trop longue.');

/**
 * Le frontend ne définit aucune politique de sécurité du mot de passe.
 * Il vérifie uniquement qu'une valeur a été saisie ; la politique canonique
 * est fournie et appliquée par le backend.
 */
const passwordCredentialSchema = z
  .string()
  .min(1, 'Le mot de passe est requis.');

const newPasswordFormValueSchema = z
  .string()
  .min(1, 'Le mot de passe est requis.');

const loginSchema = z.strictObject({
  email: emailSchema,
  password: passwordCredentialSchema,
});

const registerSchema = z
  .strictObject({
    firstName: z.string().trim().min(1, 'Le prénom est requis.').max(100, 'Le prénom est trop long.'),
    lastName: z.string().trim().min(1, 'Le nom est requis.').max(100, 'Le nom est trop long.'),
    email: emailSchema,
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

const forgotPasswordFormSchema = z.strictObject({
  email: emailSchema,
});

const resetPasswordFormSchema = z
  .strictObject({
    newPassword: newPasswordFormValueSchema,
    confirmPassword: newPasswordFormValueSchema,
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas.',
    path: ['confirmPassword'],
  });

export {
  emailSchema,
  forgotPasswordFormSchema,
  loginSchema,
  newPasswordFormValueSchema,
  passwordCredentialSchema,
  registerSchema,
  resetPasswordFormSchema,
};
