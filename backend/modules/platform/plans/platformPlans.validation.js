import { z } from 'zod';

import {
    PLAN_STATUS,
} from '../../../constants/plan.constants.js';

const PLAN_CAPABILITY_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

const planLimitValueSchema = z.union([
    z
        .number()
        .int('Une limite de plan doit être un entier')
        .nonnegative('Une limite de plan doit être positive ou nulle'),
    z.null(),
]);

const planLimitsSchema = z.record(
    z
        .string()
        .regex(
            PLAN_CAPABILITY_KEY_PATTERN,
            'Le format d’une clé de limite est invalide',
        ),
    planLimitValueSchema,
);

const planFeaturesSchema = z
    .array(
        z
            .string()
            .trim()
            .regex(
                PLAN_CAPABILITY_KEY_PATTERN,
                'Le format d’une feature est invalide',
            ),
    )
    .refine(
        (features) => new Set(features).size === features.length,
        {
            message: 'Les features ne doivent pas contenir de doublons',
        },
    );

const trialDurationSchema = z
    .number()
    .int('trialDurationDays doit être un entier')
    .positive('trialDurationDays doit être strictement positif')
    .nullable();

const validateTrialPair = (data, context, { requirePair }) => {
    const hasEnabled = Object.hasOwn(data, 'trialEnabled');
    const hasDuration = Object.hasOwn(data, 'trialDurationDays');

    if (!hasEnabled && !hasDuration) return;

    if (requirePair && (!hasEnabled || !hasDuration)) {
        context.addIssue({
            code: 'custom',
            path: !hasEnabled ? ['trialEnabled'] : ['trialDurationDays'],
            message:
                'trialEnabled et trialDurationDays doivent être fournis ensemble',
        });
        return;
    }

    if (data.trialEnabled === true && data.trialDurationDays == null) {
        context.addIssue({
            code: 'custom',
            path: ['trialDurationDays'],
            message:
                'trialDurationDays est requis lorsque le trial est activé',
        });
    }

    if (data.trialEnabled === false && data.trialDurationDays !== null) {
        context.addIssue({
            code: 'custom',
            path: ['trialDurationDays'],
            message:
                'trialDurationDays doit être null lorsque le trial est désactivé',
        });
    }
};

const createPlatformPlanBodySchema = z
    .strictObject({
        name: z
            .string()
            .trim()
            .min(2, 'name doit contenir au minimum 2 caractères')
            .max(120, 'name ne peut pas dépasser 120 caractères'),

        description: z
            .string()
            .trim()
            .max(1000, 'description ne peut pas dépasser 1000 caractères')
            .nullable()
            .optional(),

        status: z.enum(Object.values(PLAN_STATUS)).optional(),
        isPublic: z.boolean().optional(),

        displayOrder: z
            .number()
            .int('displayOrder doit être un entier')
            .nonnegative('displayOrder doit être positif ou nul')
            .optional(),

        trialEnabled: z.boolean().optional(),
        trialDurationDays: trialDurationSchema.optional(),

        currency: z
            .string()
            .trim()
            .length(3, 'currency doit contenir exactement 3 caractères')
            .regex(/^[A-Za-z]{3}$/, 'Le format de currency est invalide')
            .transform((value) => value.toUpperCase()),

        priceMonthlyExclTaxMinor: z
            .number()
            .int('priceMonthlyExclTaxMinor doit être un entier')
            .nonnegative('priceMonthlyExclTaxMinor doit être positif ou nul'),

        priceYearlyExclTaxMinor: z
            .number()
            .int('priceYearlyExclTaxMinor doit être un entier')
            .nonnegative('priceYearlyExclTaxMinor doit être positif ou nul'),

        features: planFeaturesSchema.optional(),
        limits: planLimitsSchema.optional(),
    })
    .superRefine((data, context) => {
        validateTrialPair(data, context, { requirePair: false });
    });

const platformPlanIdParamsSchema = z.strictObject({
    planId: z
        .string()
        .regex(/^[a-f\d]{24}$/i, 'planId invalide'),
});

const updatePlatformPlanBodySchema = z
    .strictObject({
        name: z
            .string()
            .trim()
            .min(2, 'name doit contenir au minimum 2 caractères')
            .max(120, 'name ne peut pas dépasser 120 caractères')
            .optional(),

        description: z
            .string()
            .trim()
            .max(1000, 'description ne peut pas dépasser 1000 caractères')
            .nullable()
            .optional(),

        status: z
            .enum([
                PLAN_STATUS.ACTIVE,
                PLAN_STATUS.INACTIVE,
            ])
            .optional(),

        isPublic: z.boolean().optional(),

        displayOrder: z
            .number()
            .int('displayOrder doit être un entier')
            .nonnegative('displayOrder doit être positif ou nul')
            .optional(),

        trialEnabled: z.boolean().optional(),
        trialDurationDays: trialDurationSchema.optional(),

        currency: z
            .string()
            .trim()
            .length(3, 'currency doit contenir exactement 3 caractères')
            .regex(/^[A-Za-z]{3}$/, 'Le format de currency est invalide')
            .transform((value) => value.toUpperCase())
            .optional(),

        priceMonthlyExclTaxMinor: z
            .number()
            .int('priceMonthlyExclTaxMinor doit être un entier')
            .nonnegative('priceMonthlyExclTaxMinor doit être positif ou nul')
            .optional(),

        priceYearlyExclTaxMinor: z
            .number()
            .int('priceYearlyExclTaxMinor doit être un entier')
            .nonnegative('priceYearlyExclTaxMinor doit être positif ou nul')
            .optional(),

        features: planFeaturesSchema.optional(),
        limits: planLimitsSchema.optional(),
    })
    .superRefine((data, context) => {
        validateTrialPair(data, context, { requirePair: true });
    })
    .refine(
        (data) => Object.keys(data).length > 0,
        {
            message: 'Au moins un champ doit être fourni pour modifier le plan',
        },
    );

export {
    createPlatformPlanBodySchema,
    platformPlanIdParamsSchema,
    updatePlatformPlanBodySchema,
};
