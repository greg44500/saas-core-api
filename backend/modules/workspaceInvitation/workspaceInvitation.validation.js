import { z } from 'zod';

import { passwordSchema } from '../../shared/validation/password.validation.js';

const objectIdSchema = (fieldName) => z
    .string()
    .regex(
        /^[a-f\d]{24}$/i,
        `${fieldName} invalide`,
    );

const invitationTokenSchema = z
    .string()
    .trim()
    .length(64, 'token invalide')
    .regex(/^[a-f\d]{64}$/i, 'token invalide');

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
    token: invitationTokenSchema,
});

/**
 * L'email est volontairement absent : il provient uniquement de l'invitation
 * validée côté serveur. Le destinataire fournit seulement son profil minimal,
 * son nouveau secret et la preuve explicite d'acceptation juridique.
 */
const acceptNewWorkspaceInvitationBodySchema = z.strictObject({
    token: invitationTokenSchema,
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    password: passwordSchema,
    legalAccepted: z.literal(true),
});

export {
    acceptNewWorkspaceInvitationBodySchema,
    acceptWorkspaceInvitationBodySchema,
    createWorkspaceInvitationBodySchema,
    workspaceIdParamsSchema,
    workspaceInvitationParamsSchema,
};
