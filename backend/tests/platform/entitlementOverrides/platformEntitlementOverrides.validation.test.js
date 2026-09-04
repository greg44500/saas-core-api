import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    ENTITLEMENT_OVERRIDE_LIFECYCLE,
    ENTITLEMENT_OVERRIDE_SOURCE,
    ENTITLEMENT_OVERRIDE_TARGET,
} from '../../../constants/entitlementOverride.constants.js';
import {
    createPlatformEntitlementOverrideBodySchema,
    listPlatformEntitlementOverridesQuerySchema,
    platformEntitlementOverrideIdParamsSchema,
    revokePlatformEntitlementOverrideBodySchema,
    updatePlatformEntitlementOverrideBodySchema,
} from '../../../modules/platform/entitlementOverrides/platformEntitlementOverrides.validation.js';


const WORKSPACE_ID = '507f1f77bcf86cd799439011';
const OVERRIDE_ID = '507f1f77bcf86cd799439012';


describe('platformEntitlementOverrides.validation', () => {
    it('accepte une création de feature connue et rejette les champs étrangers', () => {
        const parsed = createPlatformEntitlementOverrideBodySchema.parse({
            workspaceId: WORKSPACE_ID,
            targetType: ENTITLEMENT_OVERRIDE_TARGET.FEATURE,
            featureKey: 'file_upload',
            featureEnabled: false,
            source: ENTITLEMENT_OVERRIDE_SOURCE.ADMINISTRATIVE,
            reason: 'Restriction commerciale temporaire',
        });

        expect(parsed.featureKey).toBe('file_upload');
        expect(parsed.featureEnabled).toBe(false);

        expect(() => createPlatformEntitlementOverrideBodySchema.parse({
            workspaceId: WORKSPACE_ID,
            targetType: ENTITLEMENT_OVERRIDE_TARGET.FEATURE,
            featureKey: 'file_upload',
            featureEnabled: true,
            source: ENTITLEMENT_OVERRIDE_SOURCE.ADMINISTRATIVE,
            reason: 'Activation temporaire',
            unexpected: true,
        })).toThrow();
    });

    it('accepte null comme limite illimitée et refuse une capability inconnue', () => {
        const parsed = createPlatformEntitlementOverrideBodySchema.parse({
            workspaceId: WORKSPACE_ID,
            targetType: ENTITLEMENT_OVERRIDE_TARGET.LIMIT,
            metricKey: 'storage_bytes',
            limitValue: null,
            source: ENTITLEMENT_OVERRIDE_SOURCE.SUPPORT,
            reason: 'Extension temporaire du stockage',
        });

        expect(parsed.limitValue).toBeNull();

        expect(() => createPlatformEntitlementOverrideBodySchema.parse({
            workspaceId: WORKSPACE_ID,
            targetType: ENTITLEMENT_OVERRIDE_TARGET.FEATURE,
            featureKey: 'unknown_feature',
            featureEnabled: true,
            source: ENTITLEMENT_OVERRIDE_SOURCE.SUPPORT,
            reason: 'Feature inconnue',
        })).toThrow('Feature inconnue du registre de capabilities.');
    });

    it('valide pagination, filtres, lifecycle et identifiants', () => {
        const query = listPlatformEntitlementOverridesQuerySchema.parse({
            page: '2',
            limit: '25',
            workspaceId: WORKSPACE_ID,
            targetType: ENTITLEMENT_OVERRIDE_TARGET.LIMIT,
            source: ENTITLEMENT_OVERRIDE_SOURCE.CONTRACT,
            lifecycle: ENTITLEMENT_OVERRIDE_LIFECYCLE.ACTIVE,
        });

        expect(query).toEqual({
            page: 2,
            limit: 25,
            workspaceId: WORKSPACE_ID,
            targetType: ENTITLEMENT_OVERRIDE_TARGET.LIMIT,
            source: ENTITLEMENT_OVERRIDE_SOURCE.CONTRACT,
            lifecycle: ENTITLEMENT_OVERRIDE_LIFECYCLE.ACTIVE,
        });

        expect(() => listPlatformEntitlementOverridesQuerySchema.parse({
            lifecycle: 'unknown',
        })).toThrow();

        expect(platformEntitlementOverrideIdParamsSchema.parse({
            overrideId: OVERRIDE_ID,
        })).toEqual({ overrideId: OVERRIDE_ID });
    });

    it('impose une mise à jour non vide et un motif de révocation', () => {
        expect(() => updatePlatformEntitlementOverrideBodySchema.parse({}))
            .toThrow();

        expect(updatePlatformEntitlementOverrideBodySchema.parse({
            reason: 'Motif commercial ajusté',
        })).toEqual({
            reason: 'Motif commercial ajusté',
        });

        expect(revokePlatformEntitlementOverrideBodySchema.parse({
            reason: 'Fin anticipée de la dérogation',
        })).toEqual({
            reason: 'Fin anticipée de la dérogation',
        });
    });
});
