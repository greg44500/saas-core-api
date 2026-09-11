import { z } from 'zod';

import {
    ACTIVE_PLAN_CAPABILITY_REGISTRY,
    getPlanFeatureMetricKeys,
} from '../../../config/applicationCapability.registry.js';
import {
    ENTITLEMENT_OVERRIDE_SOURCE,
} from '../../../constants/entitlementOverride.constants.js';


const objectIdSchema = z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Identifiant invalide');

const isoDateTimeSchema = z.iso
    .datetime({ offset: true })
    .transform((value) => new Date(value));

const groupNameSchema = z
    .string()
    .trim()
    .min(3, 'Le nom de la dérogation doit contenir au moins 3 caractères.')
    .max(120, 'Le nom de la dérogation ne peut pas dépasser 120 caractères.');

const reasonSchema = z
    .string()
    .trim()
    .min(3)
    .max(500);

const sourceSchema = z.enum(
    Object.values(ENTITLEMENT_OVERRIDE_SOURCE),
);

const limitValueSchema = z.union([
    z.number().int().min(0),
    z.null(),
]);

const featureKeySchema = z
    .string()
    .trim()
    .refine(
        (featureKey) => ACTIVE_PLAN_CAPABILITY_REGISTRY.features.has(featureKey),
        'Feature inconnue du registre de capabilities.',
    );

const metricKeySchema = z
    .string()
    .trim()
    .refine(
        (metricKey) => ACTIVE_PLAN_CAPABILITY_REGISTRY.metrics.has(metricKey),
        'Métrique inconnue du registre de capabilities.',
    );

const relatedLimitSchema = z.strictObject({
    metricKey: metricKeySchema,
    limitValue: limitValueSchema,
});

const validatePeriod = (value, context) => {
    if (
        value.startsAt
        && value.endsAt
        && value.endsAt <= value.startsAt
    ) {
        context.addIssue({
            code: 'custom',
            message:
                'La fin de la dérogation doit être postérieure à son début.',
            path: ['endsAt'],
        });
    }
};

const validateUniqueRelatedLimits = (value, context) => {
    if (!value.relatedLimits) return;

    const seen = new Set();
    value.relatedLimits.forEach((limit, index) => {
        if (seen.has(limit.metricKey)) {
            context.addIssue({
                code: 'custom',
                message: 'Une métrique ne peut être configurée qu’une seule fois.',
                path: ['relatedLimits', index, 'metricKey'],
            });
        }
        seen.add(limit.metricKey);
    });
};

const createPlatformFeatureOverrideGroupBodySchema = z
    .strictObject({
        workspaceId: objectIdSchema,
        groupName: groupNameSchema,
        featureKey: featureKeySchema,
        featureEnabled: z.literal(true),
        relatedLimits: z.array(relatedLimitSchema).max(20).default([]),
        source: sourceSchema,
        startsAt: isoDateTimeSchema.optional(),
        endsAt: isoDateTimeSchema.nullable().optional(),
        reason: reasonSchema,
    })
    .superRefine(validatePeriod)
    .superRefine(validateUniqueRelatedLimits)
    .superRefine((value, context) => {
        const allowedMetrics = new Set(
            getPlanFeatureMetricKeys(value.featureKey),
        );

        value.relatedLimits.forEach((limit, index) => {
            if (!allowedMetrics.has(limit.metricKey)) {
                context.addIssue({
                    code: 'custom',
                    message:
                        'Cette métrique n’est pas associée à la fonctionnalité sélectionnée.',
                    path: ['relatedLimits', index, 'metricKey'],
                });
            }
        });
    });

const updatePlatformFeatureOverrideGroupBodySchema = z
    .strictObject({
        groupName: groupNameSchema.optional(),
        featureEnabled: z.boolean().optional(),
        relatedLimits: z.array(relatedLimitSchema).max(20).optional(),
        source: sourceSchema.optional(),
        startsAt: isoDateTimeSchema.optional(),
        endsAt: isoDateTimeSchema.nullable().optional(),
        reason: reasonSchema.optional(),
    })
    .refine(
        (value) => Object.keys(value).length > 0,
        'Au moins un champ doit être fourni.',
    )
    .superRefine(validatePeriod)
    .superRefine(validateUniqueRelatedLimits);

const platformFeatureOverrideGroupParamsSchema = z.strictObject({
    overrideId: objectIdSchema,
});


export {
    createPlatformFeatureOverrideGroupBodySchema,
    platformFeatureOverrideGroupParamsSchema,
    updatePlatformFeatureOverrideGroupBodySchema,
};
