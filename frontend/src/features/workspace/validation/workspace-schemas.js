import { z } from 'zod';

const workspaceNameSchema = z
  .string()
  .trim()
  .min(2, 'Le nom doit contenir au moins 2 caractères.')
  .max(120, 'Le nom ne peut pas dépasser 120 caractères.');

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Sélection invalide.');

const currentPasswordSchema = z
  .string()
  .min(15, 'Le mot de passe actuel doit contenir au moins 15 caractères.')
  .max(128, 'Le mot de passe actuel ne peut pas dépasser 128 caractères.');

const createWorkspaceSchema = z.object({
  name: workspaceNameSchema,
});

const updateWorkspaceSchema = z.object({
  name: workspaceNameSchema,
});

const transferWorkspaceOwnershipSchema = z.object({
  newOwnerMemberId: objectIdSchema,
  previousOwnerRoleId: objectIdSchema,
  currentPassword: currentPasswordSchema,
});

function createArchiveWorkspaceSchema(expectedWorkspaceName) {
  return z
    .strictObject({
      currentPassword: currentPasswordSchema,
      confirmationName: workspaceNameSchema,
    })
    .superRefine((values, context) => {
      if (values.confirmationName !== expectedWorkspaceName) {
        context.addIssue({
          code: 'custom',
          message: 'Saisissez exactement le nom du workspace pour confirmer.',
          path: ['confirmationName'],
        });
      }
    });
}

export {
  createArchiveWorkspaceSchema,
  createWorkspaceSchema,
  transferWorkspaceOwnershipSchema,
  updateWorkspaceSchema,
  workspaceNameSchema,
};
