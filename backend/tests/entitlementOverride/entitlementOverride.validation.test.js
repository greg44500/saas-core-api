import { describe, expect, it } from 'vitest';

import {
    createPlanCapabilityRegistry,
} from '../../modules/plan/planCapability.registry.js';
import {
    createEntitlementOverrideSchema,
    createEntitlementOverrideSchemas,
    revokeEntitlementOverrideSchema,
    updateEntitlementOverrideSchema,
} from '../../modules/entitlementOverride/entitlementOverride.validation.js';


const workspaceId = '507f1f77bcf86cd799439011';

const basePayload = {
    workspaceId,
    source: 'promotion',
    startsAt: '2026-09-03T10:00:00+02:00',
    endsAt: '2026-10-03T10:00:00+02:00',
    reason: 'Découverte commerciale encadrée',
};

describe('EntitlementOverride validation', () => {
    it('accepte une feature connue du registre Core', () => {
        const result = createEntitlementOverrideSchema.safeParse({
            ...basePayload,
            targetType: 'feature',
            featureKey: 'audit_logs',
            featureEnabled: true,
        });

        expect(result.success).toBe(true);
    });

    it('accepte une limite connue et null comme valeur illimitée', () => {
        const result = createEntitlementOverrideSchema.safeParse({
            ...basePayload,
            targetType: 'limit',
            metricKey: 'storage_bytes',
            limitValue: null,
        });

        expect(result.success).toBe(true);
    });

    it('refuse une capability inconnue du registre', () => {
        const result = createEntitlementOverrideSchema.safeParse({
            ...basePayload,
            targetType: 'feature',
            featureKey: 'unknown_feature',
            featureEnabled: true,
        });

        expect(result.success).toBe(false);
    });

    it('refuse trial comme origine car le trial reste une Subscription', () => {
        const result = createEntitlementOverrideSchema.safeParse({
            ...basePayload,
            source: 'trial',
            targetType: 'feature',
            featureKey: 'audit_logs',
            featureEnabled: true,
        });

        expect(result.success).toBe(false);
    });

    it('refuse les champs supplémentaires', () => {
        const result = createEntitlementOverrideSchema.safeParse({
            ...basePayload,
            targetType: 'limit',
            metricKey: 'members',
            limitValue: 10,
            operator: { $gt: 0 },
        });

        expect(result.success).toBe(false);
    });

    it('refuse une fin antérieure ou égale au début', () => {
        const result = createEntitlementOverrideSchema.safeParse({
            ...basePayload,
            targetType: 'feature',
            featureKey: 'file_upload',
            featureEnabled: false,
            endsAt: basePayload.startsAt,
        });

        expect(result.success).toBe(false);
    });

    it('autorise une capability ajoutée par une application métier', () => {
        const registry = createPlanCapabilityRegistry({
            features: ['ai_analysis'],
            metricDefinitions: {
                active_projects: {
                    periodType: 'current',
                    behavior: 'capacity',
                    remediationRequired: true,
                },
            },
        });

        const { createSchema } = createEntitlementOverrideSchemas({
            registry,
        });

        expect(createSchema.safeParse({
            ...basePayload,
            targetType: 'feature',
            featureKey: 'ai_analysis',
            featureEnabled: true,
        }).success).toBe(true);

        expect(createSchema.safeParse({
            ...basePayload,
            targetType: 'limit',
            metricKey: 'active_projects',
            limitValue: 25,
        }).success).toBe(true);
    });

    it('refuse une mise à jour vide ou mélangeant les deux types de valeur', () => {
        expect(updateEntitlementOverrideSchema.safeParse({}).success)
            .toBe(false);

        expect(updateEntitlementOverrideSchema.safeParse({
            featureEnabled: true,
            limitValue: 20,
        }).success).toBe(false);
    });

    it('valide une révocation uniquement avec un motif explicite', () => {
        expect(revokeEntitlementOverrideSchema.safeParse({
            reason: 'Fin anticipée du geste commercial',
        }).success).toBe(true);

        expect(revokeEntitlementOverrideSchema.safeParse({
            reason: 'x',
        }).success).toBe(false);
    });
});
