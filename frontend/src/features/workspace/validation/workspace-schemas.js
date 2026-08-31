import { z } from 'zod';

const workspaceNameSchema = z
  .string()
  .trim()
  .min(2, 'Le nom doit contenir au moins 2 caractères.')
  .max(120, 'Le nom ne peut pas dépasser 120 caractères.');

const createWorkspaceSchema = z.object({
  name: workspaceNameSchema,
});

export { createWorkspaceSchema, workspaceNameSchema };
