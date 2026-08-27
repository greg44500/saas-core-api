import { z } from 'zod';
import { PLATFORM_ROLE } from '../../../constants/platformRoles.constants.js';

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

const updatePlatformUserRoleBodySchema = z.strictObject({
    platformRole: z.enum(Object.values(PLATFORM_ROLE)),
});

export {
    disablePlatformUserBodySchema,
    platformUserIdParamsSchema,
    updatePlatformUserRoleBodySchema,
};
