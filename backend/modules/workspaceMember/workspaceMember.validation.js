import { z } from 'zod';

const objectIdSchema = (fieldName) => z
    .string()
    .regex(/^[a-f\d]{24}$/i, `${fieldName} invalide`);

const workspaceMemberParamsSchema = z.strictObject({
    workspaceId: objectIdSchema('workspaceId'),
    memberId: objectIdSchema('memberId'),
});

const updateWorkspaceMemberRoleBodySchema = z.strictObject({
    roleId: objectIdSchema('roleId'),
});

export {
    updateWorkspaceMemberRoleBodySchema,
    workspaceMemberParamsSchema,
};
