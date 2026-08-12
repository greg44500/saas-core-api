import { z } from 'zod';


const createWorkspaceSchema = z.strictObject({
    name: z
        .string()
        .trim()
        .min(2)
        .max(120),
});

const updateWorkspaceSchema = z.strictObject({
    name: z
        .string()
        .trim()
        .min(2)
        .max(120),
});


/**
 * Valide l'identifiant technique du workspace reçu dans l'URL.
 *
 * Un ObjectId MongoDB est représenté par 24 caractères hexadécimaux.
 * Cette validation évite de transmettre à Mongoose un identifiant
 * manifestement invalide.
 */
const workspaceIdParamsSchema = z.strictObject({
    workspaceId: z
        .string()
        .regex(
            /^[a-f\d]{24}$/i,
            'workspaceId invalide',
        ),
});


export {
    createWorkspaceSchema,
    workspaceIdParamsSchema,
    updateWorkspaceSchema,
};