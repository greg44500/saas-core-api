import { z } from 'zod';

const mongoIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Plan invalide.');

const commercialInvitationTokenSchema = z
  .string()
  .trim()
  .length(64, 'Lien d’invitation invalide.')
  .regex(/^[a-f\d]{64}$/i, 'Lien d’invitation invalide.');

const commercialInvitationFormSchema = z.strictObject({
  email: z.string().trim().email('Adresse email invalide.').max(254),
  planId: mongoIdSchema,
  workspaceName: z
    .string()
    .trim()
    .min(2, 'Le nom doit contenir au moins 2 caractères.')
    .max(120, 'Le nom ne peut pas dépasser 120 caractères.'),
  billingInterval: z.enum(['none', 'monthly', 'yearly']),
  reason: z
    .string()
    .trim()
    .min(3, 'Le motif doit contenir au moins 3 caractères.')
    .max(500, 'Le motif ne peut pas dépasser 500 caractères.'),
});

export {
  commercialInvitationFormSchema,
  commercialInvitationTokenSchema,
};
