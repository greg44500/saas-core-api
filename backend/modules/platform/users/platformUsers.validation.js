import { z } from 'zod';

const platformUserIdParamsSchema = z.strictObject({
    userId: z.string().regex(/^[a-f\d]{24}$/i, 'userId invalide'),
});

const disablePlatformUserBodySchema = z.strictObject({
    disabledReason: z
        .string()
        .trim()
        .min(3, 'disabledReason doit contenir au minimum 3 caractères')
        .max(500, 'disabledReason ne peut pas dépasser 500 caractères'),
});

const closePlatformUserBodySchema = z.strictObject({
    reason: z
        .string()
        .trim()
        .min(3, 'reason doit contenir au minimum 3 caractères')
        .max(500, 'reason ne peut pas dépasser 500 caractères'),
});

export {
    closePlatformUserBodySchema,
    disablePlatformUserBodySchema,
    platformUserIdParamsSchema,
};
