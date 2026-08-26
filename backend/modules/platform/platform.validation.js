import { z } from 'zod';
import {
    PLATFORM_ROLE,
} from '../../constants/platformRoles.constants.js';

/**
 * Valide la pagination de la liste des utilisateurs plateforme.
 *
 * Les paramètres provenant de req.query sont des chaînes.
 * coerce permet donc de les convertir explicitement en nombres
 * avant leur transmission au service.
 */
const listPlatformUsersQuerySchema = z.strictObject({
    page: z.coerce
        .number()
        .int()
        .min(1)
        .default(1),

    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20),
});

const platformUserIdParamsSchema = z.strictObject({
    userId: z
        .string()
        .regex(
            /^[a-f\d]{24}$/i,
            'userId invalide',
        ),
});

const disablePlatformUserBodySchema = z.strictObject({
    disabledReason: z
        .string()
        .trim()
        .min(
            3,
            'disabledReason doit contenir au minimum 3 caractères',
        )
        .max(
            500,
            'disabledReason ne peut pas dépasser 500 caractères',
        ),
});

const updatePlatformUserRoleBodySchema = z.strictObject({
    platformRole: z.enum(
        Object.values(PLATFORM_ROLE),
    ),
});


export {
    listPlatformUsersQuerySchema,
    disablePlatformUserBodySchema,
    platformUserIdParamsSchema,
    updatePlatformUserRoleBodySchema,
};