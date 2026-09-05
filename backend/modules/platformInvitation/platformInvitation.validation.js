import { z } from 'zod';

import { passwordSchema } from '../../shared/validation/password.validation.js';
import { userIdentityInputSchema } from '../users/user.validation.js';


const mongoIdSchema = z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Identifiant invalide');

const invitationTokenSchema = z
    .string()
    .trim()
    .length(64, 'Token d’invitation invalide')
    .regex(/^[a-f\d]{64}$/i, 'Token d’invitation invalide');

/**
 * Le client fournit uniquement l'identité utile à l'invitation et le rôle
 * cible. Les statuts, dates, acteur et secret sont exclusivement serveur.
 */
const createPlatformInvitationBodySchema =
    userIdentityInputSchema.extend({
        roleId: mongoIdSchema,
    });

const platformInvitationIdParamsSchema = z.strictObject({
    invitationId: mongoIdSchema,
});

const acceptExistingPlatformInvitationBodySchema = z.strictObject({
    token: invitationTokenSchema,
});

/**
 * L'identité et l'email du nouveau User proviennent exclusivement de
 * l'invitation déjà validée. Le client ne peut donc pas substituer une autre
 * personne au moment d'accepter le lien.
 */
const acceptNewPlatformInvitationBodySchema = z.strictObject({
    token: invitationTokenSchema,
    password: passwordSchema,
});

export {
    acceptExistingPlatformInvitationBodySchema,
    acceptNewPlatformInvitationBodySchema,
    createPlatformInvitationBodySchema,
    invitationTokenSchema,
    platformInvitationIdParamsSchema,
};
