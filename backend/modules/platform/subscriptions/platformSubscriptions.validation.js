import { z } from 'zod';

import {
    BILLING_INTERVAL,
    DISCOUNT_TYPE,
} from '../../../constants/subscription.constants.js';


/**
 * Valide l'identifiant MongoDB d'une souscription administrée via Platform.
 */
const platformSubscriptionIdParamsSchema = z.strictObject({
    subscriptionId: z
        .string()
        .regex(
            /^[a-f\d]{24}$/i,
            'subscriptionId invalide',
        ),
});


/**
 * Valide les champs administrativement modifiables d'une souscription.
 *
 * Les champs structurels, techniques et liés au cycle de vie sont
 * volontairement exclus de ce PATCH générique.
 */
const updatePlatformSubscriptionBodySchema = z
    .strictObject({
        plan: z
            .string()
            .regex(
                /^[a-f\d]{24}$/i,
                'plan invalide',
            )
            .optional(),

        billingInterval: z
            .enum(Object.values(BILLING_INTERVAL))
            .optional(),

        discountType: z
            .enum(Object.values(DISCOUNT_TYPE))
            .optional(),

        discountValue: z
            .number()
            .int()
            .nonnegative()
            .optional(),

        discountReason: z
            .string()
            .trim()
            .min(1)
            .max(500)
            .nullable()
            .optional(),

        discountEndsAt: z
            .coerce
            .date()
            .nullable()
            .optional(),

        manualOverride: z
            .boolean()
            .optional(),

        manualOverrideReason: z
            .string()
            .trim()
            .min(1)
            .max(500)
            .nullable()
            .optional(),

        cancelAtPeriodEnd: z
            .boolean()
            .optional(),
    })
    .superRefine((data, ctx) => {
        if (Object.keys(data).length === 0) {
            ctx.addIssue({
                code: 'custom',
                message:
                    'Au moins un champ doit être fourni.',
            });
        }

        if (
            data.discountType
            === DISCOUNT_TYPE.PERCENTAGE
            && (
                data.discountValue === undefined
                || data.discountValue < 1
                || data.discountValue > 100
            )
        ) {
            ctx.addIssue({
                code: 'custom',
                path: ['discountValue'],
                message:
                    'Une remise en pourcentage doit être comprise entre 1 et 100.',
            });
        }

        if (
            data.discountType
            === DISCOUNT_TYPE.FIXED_AMOUNT
            && (
                data.discountValue === undefined
                || data.discountValue < 1
            )
        ) {
            ctx.addIssue({
                code: 'custom',
                path: ['discountValue'],
                message:
                    'Une remise fixe doit être supérieure à zéro.',
            });
        }

        if (
            data.discountType
            && data.discountType !== DISCOUNT_TYPE.NONE
            && !data.discountReason
        ) {
            ctx.addIssue({
                code: 'custom',
                path: ['discountReason'],
                message:
                    'Le motif de la remise est obligatoire.',
            });
        }

        if (
            data.manualOverride === true
            && !data.manualOverrideReason
        ) {
            ctx.addIssue({
                code: 'custom',
                path: ['manualOverrideReason'],
                message:
                    'Le motif de la dérogation est obligatoire.',
            });
        }
    });


export {
    platformSubscriptionIdParamsSchema,
    updatePlatformSubscriptionBodySchema,
};