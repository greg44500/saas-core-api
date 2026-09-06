import { z } from 'zod';

import {
    PLATFORM_ROLE_STATUS,
} from '../../constants/platformTeam.constants.js';


const PLATFORM_PERMISSION_PATTERN =
    /^platform:[a-z0-9_]+(?::[a-z0-9_]+)+$/;

const platformPermissionKeysSchema = z
    .array(
        z
            .string()
            .trim()
            .regex(
                PLATFORM_PERMISSION_PATTERN,
                'Le format d’une permission Platform est invalide',
            ),
    )
    .max(200, 'Un rôle ne peut pas contenir plus de 200 permissions')
    .refine(
        (permissions) =>
            new Set(permissions).size === permissions.length,
        {
            message: 'Les permissions ne doivent pas contenir de doublons',
        },
    );

const platformRoleNameSchema = z
    .string()
    .trim()
    .min(2, 'name doit contenir au minimum 2 caractères')
    .max(100, 'name ne peut pas dépasser 100 caractères');

const platformRoleDescriptionSchema = z
    .string()
    .trim()
    .min(
        1,
        'description doit contenir une justification métier explicite',
    )
    .max(500, 'description ne peut pas dépasser 500 caractères');

/**
 * La clé technique, isSystem et le statut ne font volontairement pas partie
 * du contrat d’entrée : la clé est générée par le backend et les transitions
 * de statut passent par des actions dédiées.
 */
const createPlatformRoleBodySchema = z.strictObject({
    name: platformRoleNameSchema,
    description: platformRoleDescriptionSchema,
    permissions: platformPermissionKeysSchema.default([]),
});

const updatePlatformRoleBodySchema = z
    .strictObject({
        name: platformRoleNameSchema.optional(),
        description: platformRoleDescriptionSchema.optional(),
        permissions: platformPermissionKeysSchema.optional(),
    })
    .refine(
        (data) => Object.keys(data).length > 0,
        {
            message: 'Au moins un champ doit être fourni pour modifier le rôle',
        },
    );

const platformRoleIdParamsSchema = z.strictObject({
    roleId: z
        .string()
        .regex(/^[a-f\d]{24}$/i, 'roleId invalide'),
});

const listPlatformRolesQuerySchema = z.strictObject({
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
    status: z
        .enum(Object.values(PLATFORM_ROLE_STATUS))
        .optional(),
});


export {
    createPlatformRoleBodySchema,
    listPlatformRolesQuerySchema,
    platformRoleIdParamsSchema,
    updatePlatformRoleBodySchema,
};
