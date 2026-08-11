import { z } from 'zod';


/**
 * Valide le corps HTTP utilisé pour créer un workspace.
 *
 * Les champs internes comme createdBy ou status ne peuvent pas
 * être fournis par le client.
 */
export const createWorkspaceSchema = z.strictObject({
    name: z
        .string()
        .trim()
        .min(2)
        .max(120),
});