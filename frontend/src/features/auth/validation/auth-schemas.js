import { z } from 'zod';

const emailSchema = z.email('Adresse email invalide.').max(254, 'Adresse email trop longue.');
const passwordSchema = z
  .string()
  .min(15, 'Le mot de passe doit contenir au moins 15 caractères.')
  .max(128, 'Le mot de passe ne peut pas dépasser 128 caractères.');

const loginSchema = z.strictObject({
  email: emailSchema,
  password: passwordSchema,
});

const registerSchema = z
  .strictObject({
    firstName: z.string().trim().min(1, 'Le prénom est requis.').max(100, 'Le prénom est trop long.'),
    lastName: z.string().trim().min(1, 'Le nom est requis.').max(100, 'Le nom est trop long.'),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: passwordSchema,
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
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas.',
    path: ['confirmPassword'],
  });

export {
  emailSchema,
  forgotPasswordFormSchema,
  loginSchema,
  passwordSchema,
  registerSchema,
  resetPasswordFormSchema,
};
