import { z } from 'zod';

import {
    BILLING_INTERVAL,
} from '../../constants/subscription.constants.js';

const mongoIdSchema = z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Identifiant invalide');

const commercialInvitationTokenSchema = z
    .string()
    .trim()
    .length(64, 'Token d’invitation invalide')
    .regex(/^[a-f\d]{64}$/i, 'Token d’invitation invalide');

/**
 * Le client administratif choisit une offre existante. Il ne peut pas injecter
 * de capabilities, limites, prix, statut ou dates de Subscription. Le motif est
 * obligatoire afin que l'accès privé reste justifiable dans l'audit Platform.
 */
const createCommercialInvitationBodySchema = z.strictObject({
    email: z.string().trim().email().max(254),
    planId: mongoIdSchema,
    workspaceName: z.string().trim().min(2).max(120),
    billingInterval: z.enum([
        BILLING_INTERVAL.NONE,
        BILLING_INTERVAL.MONTHLY,
        BILLING_INTERVAL.YEARLY,
    ]),
    reason: z.string().trim().min(3).max(500),
});

const commercialInvitationIdParamsSchema = z.strictObject({
    invitationId: mongoIdSchema,
});

const revokeCommercialInvitationBodySchema = z.strictObject({
    reason: z.string().trim().min(3).max(500),
});

const previewCommercialInvitationBodySchema = z.strictObject({
    token: commercialInvitationTokenSchema,
});

const acceptCommercialInvitationBodySchema = z.strictObject({
    token: commercialInvitationTokenSchema,
});

export {
    acceptCommercialInvitationBodySchema,
    commercialInvitationIdParamsSchema,
    commercialInvitationTokenSchema,
    createCommercialInvitationBodySchema,
    previewCommercialInvitationBodySchema,
    revokeCommercialInvitationBodySchema,
};
