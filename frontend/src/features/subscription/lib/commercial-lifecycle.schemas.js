import { z } from 'zod';

const cancellationReasonSchema = z
  .string()
  .trim()
  .max(500, 'Le motif ne peut pas dépasser 500 caractères.')
  .transform((value) => value || null);

const downgradeTargetSchema = z.string().trim().min(1, 'Choisissez un plan cible.');

export { cancellationReasonSchema, downgradeTargetSchema };
