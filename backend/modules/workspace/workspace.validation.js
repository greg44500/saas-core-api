import { z } from 'zod';

/**
 * Valide les données autorisées lors de la création d’un workspace.
 *
 * Les champs de gouvernance et de traçabilité sont volontairement exclus :
 * ils seront renseignés par le service, jamais acceptés depuis le client.
 */

const createWorkspaceSchema = z.strictObject({
    body: z.strictObject({
        name: z
            .string()
            .trim()
            .min(2, "Le nom du workspace doit contenur au moins 2 caractères'")
            .max(120, "Le nom du workspace ne peut pas dépasser 120 caractères."),

    }),
});

export { createWorkspaceSchema }