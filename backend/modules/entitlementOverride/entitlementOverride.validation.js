import { z } from 'zod';

import {
    ENTITLEMENT_OVERRIDE_SOURCE,
    ENTITLEMENT_OVERRIDE_TARGET,
} from '../../constants/entitlementOverride.constants.js';
import {
    DEFAULT_PLAN_CAPABILITY_REGISTRY,
} from '../plan/planCapability.registry.js';


const objectIdSchema = z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Identifiant invalide');

const capabilityKeySchema = z
    .string()
    .trim()
    .regex(
        /^[a-z][a-z0-9_]*$/,
        'Le format de la capability est invalide.',
    );

const isoDateTimeSchema = z.iso
    .datetime({ offset: true })
    .transform((value) => new Date(value));

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

/**
 * Construit les schémas à partir du registre actif afin que le Core générique
 * et une application métier enrichie puissent partager la même validation.
 */
const createEntitlementOverrideSchemas = ({
    registry = DEFAULT_PLAN_CAPABILITY_REGISTRY,
} = {}) => {
    if (
        !registry
        || !(registry.features instanceof Set)
        || !(registry.metrics instanceof Set)
    ) {
        throw new TypeError(
            'registry must expose feature and metric sets',
        );
    }

    const featureKeySchema = capabilityKeySchema.refine(
        (featureKey) => registry.features.has(featureKey),
        'Feature inconnue du registre de capabilities.',
    );

    const metricKeySchema = capabilityKeySchema.refine(
        (metricKey) => registry.metrics.has(metricKey),
        'Métrique inconnue du registre de capabilities.',
    );

    const featureOverrideSchema = z.strictObject({
        workspaceId: objectIdSchema,
        targetType: z.literal(ENTITLEMENT_OVERRIDE_TARGET.FEATURE),
        featureKey: featureKeySchema,
        featureEnabled: z.boolean(),
        source: sourceSchema,
        startsAt: isoDateTimeSchema.optional(),
        endsAt: isoDateTimeSchema.nullable().optional(),
        reason: reasonSchema,
    });

    const limitOverrideSchema = z.strictObject({
        workspaceId: objectIdSchema,
        targetType: z.literal(ENTITLEMENT_OVERRIDE_TARGET.LIMIT),
        metricKey: metricKeySchema,
        limitValue: limitValueSchema,
        source: sourceSchema,
        startsAt: isoDateTimeSchema.optional(),
        endsAt: isoDateTimeSchema.nullable().optional(),
        reason: reasonSchema,
    });

    const createSchema = z
        .discriminatedUnion('targetType', [
            featureOverrideSchema,
            limitOverrideSchema,
        ])
        .superRefine(validatePeriod);

    /**
     * La cible d'un override est immutable. Une mise à jour peut modifier sa
     * valeur, son origine, sa période ou son motif, mais jamais transformer une
     * feature en métrique ou inversement. Le service vérifiera que la valeur
     * envoyée correspond bien au targetType du document existant.
     */
    const updateSchema = z
        .strictObject({
            featureEnabled: z.boolean().optional(),
            limitValue: limitValueSchema.optional(),
            source: sourceSchema.optional(),
            startsAt: isoDateTimeSchema.optional(),
            endsAt: isoDateTimeSchema.nullable().optional(),
            reason: reasonSchema.optional(),
        })
        .refine(
            (value) => Object.keys(value).length > 0,
            'Au moins un champ doit être fourni.',
        )
        .refine(
            (value) => !(
                value.featureEnabled !== undefined
                && value.limitValue !== undefined
            ),
            {
                message:
                    'Une mise à jour ne peut pas modifier simultanément une feature et une limite.',
                path: ['featureEnabled'],
            },
        )
        .superRefine(validatePeriod);

    const revokeSchema = z.strictObject({
        reason: reasonSchema,
    });

    const paramsSchema = z.strictObject({
        overrideId: objectIdSchema,
    });

    return Object.freeze({
        createSchema,
        paramsSchema,
        revokeSchema,
        updateSchema,
    });
};

const {
    createSchema: createEntitlementOverrideSchema,
    paramsSchema: entitlementOverrideParamsSchema,
    revokeSchema: revokeEntitlementOverrideSchema,
    updateSchema: updateEntitlementOverrideSchema,
} = createEntitlementOverrideSchemas();

export {
    createEntitlementOverrideSchema,
    createEntitlementOverrideSchemas,
    entitlementOverrideParamsSchema,
    revokeEntitlementOverrideSchema,
    updateEntitlementOverrideSchema,
};
