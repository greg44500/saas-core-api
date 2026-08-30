import { z } from 'zod';

const objectIdSchema = (fieldName) => z
    .string()
    .regex(
        /^[a-f\d]{24}$/i,
        `${fieldName} invalide`,
    );

const createWorkspaceInvitationBodySchema = z.strictObject({
    email: z
        .string()
        .trim()
        .email('email invalide')
        .max(254),
    roleId: objectIdSchema('roleId'),
});

const workspaceIdParamsSchema = z.strictObject({
    workspaceId: objectIdSchema('workspaceId'),
});

const workspaceInvitationParamsSchema = z.strictObject({
    workspaceId: objectIdSchema('workspaceId'),
    invitationId: objectIdSchema('invitationId'),
});

const acceptWorkspaceInvitationBodySchema = z.strictObject({
    token: z
        .string()
        .regex(/^[a-f\d]{64}$/i, 'token invalide'),
});

export {
    acceptWorkspaceInvitationBodySchema,
    createWorkspaceInvitationBodySchema,
    workspaceIdParamsSchema,
    workspaceInvitationParamsSchema,
};
