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
 * Pour un nouveau compte, l'email n'est volontairement pas accepté dans le
 * body : l'adresse canonique de l'invitation est l'unique source de vérité.
 */
const acceptNewPlatformInvitationBodySchema = z.strictObject({
    token: invitationTokenSchema,
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    password: passwordSchema,
});

export {
    acceptExistingPlatformInvitationBodySchema,
    acceptNewPlatformInvitationBodySchema,
    createPlatformInvitationBodySchema,
    invitationTokenSchema,
    platformInvitationIdParamsSchema,
};
