import { z } from 'zod';

import {
    ENTITLEMENT_OVERRIDE_LIFECYCLE,
    ENTITLEMENT_OVERRIDE_SOURCE,
    ENTITLEMENT_OVERRIDE_TARGET,
} from '../../../constants/entitlementOverride.constants.js';
import {
    createEntitlementOverrideSchemas,
} from '../../entitlementOverride/entitlementOverride.validation.js';


const objectIdSchema = z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Identifiant invalide');

const {
    createSchema: createPlatformEntitlementOverrideBodySchema,
    revokeSchema: revokePlatformEntitlementOverrideBodySchema,
    updateSchema: updatePlatformEntitlementOverrideBodySchema,
} = createEntitlementOverrideSchemas();

/**
 * Les filtres de lecture restent indépendants du corps d'écriture afin que
 * l'administration puisse parcourir l'historique sans réutiliser des schémas
 * destinés aux mutations commerciales.
 */
const listPlatformEntitlementOverridesQuerySchema = z.strictObject({
    page: z.coerce
        .number()
        .int()
        .min(1)
        .default(1),
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20),
    workspaceId: objectIdSchema.optional(),
    targetType: z.enum(
        Object.values(ENTITLEMENT_OVERRIDE_TARGET),
    ).optional(),
    source: z.enum(
        Object.values(ENTITLEMENT_OVERRIDE_SOURCE),
    ).optional(),
    lifecycle: z.enum(
        Object.values(ENTITLEMENT_OVERRIDE_LIFECYCLE),
    ).optional(),
});

const platformEntitlementOverrideIdParamsSchema = z.strictObject({
    overrideId: objectIdSchema,
});

const platformEntitlementContextWorkspaceParamsSchema = z.strictObject({
    workspaceId: objectIdSchema,
});


export {
    createPlatformEntitlementOverrideBodySchema,
    listPlatformEntitlementOverridesQuerySchema,
    platformEntitlementContextWorkspaceParamsSchema,
    platformEntitlementOverrideIdParamsSchema,
    revokePlatformEntitlementOverrideBodySchema,
    updatePlatformEntitlementOverrideBodySchema,
};
