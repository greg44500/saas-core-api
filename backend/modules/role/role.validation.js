import { z } from 'zod';

const objectIdSchema = (fieldName) => z
    .string()
    .regex(/^[a-f\d]{24}$/i, `${fieldName} invalide`);

const permissionSchema = z
    .string()
    .trim()
    .regex(
        /^[a-z][a-z0-9_-]*(?::[a-z][a-z0-9_-]*)+$/,
        'Permission invalide',
    );

const roleParamsSchema = z.strictObject({
    workspaceId: objectIdSchema('workspaceId'),
    roleId: objectIdSchema('roleId'),
});

const roleNameSchema = z.string().trim().min(2).max(80);
const roleDescriptionSchema = z.string().trim().max(500).nullable();
const rolePermissionsSchema = z.array(permissionSchema).max(100);

const createWorkspaceRoleBodySchema = z.strictObject({
    name: roleNameSchema,
    description: roleDescriptionSchema.optional(),
    permissions: rolePermissionsSchema.default([]),
});

const updateWorkspaceRoleBodySchema = z
    .strictObject({
        name: roleNameSchema.optional(),
        description: roleDescriptionSchema.optional(),
        permissions: rolePermissionsSchema.optional(),
    })
    .refine(
        (body) => Object.keys(body).length > 0,
        'Au moins un champ doit être fourni',
    );

export {
    createWorkspaceRoleBodySchema,
    roleParamsSchema,
    updateWorkspaceRoleBodySchema,
};
