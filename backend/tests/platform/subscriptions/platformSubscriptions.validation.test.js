import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    cancelPlatformSubscriptionBodySchema,
    grantTrialBodySchema,
    updatePlatformSubscriptionBodySchema,
} from '../../../modules/platform/subscriptions/platformSubscriptions.validation.js';


describe('grantTrialBodySchema', () => {
    const validPayload = {
        workspaceId:
            '507f1f77bcf86cd799439011',
        planId:
            '507f191e810c19729de860ea',
        billingInterval: 'monthly',
    };

    it('accepte une attribution de trial mensuelle valide', () => {
        const result =
            grantTrialBodySchema.safeParse(
                validPayload,
            );

        expect(result.success).toBe(true);
    });

    it('accepte une attribution de trial annuelle valide', () => {
        const result =
            grantTrialBodySchema.safeParse({
                ...validPayload,
                billingInterval: 'yearly',
            });

        expect(result.success).toBe(true);
    });

    it('refuse la périodicité none', () => {
        const result =
            grantTrialBodySchema.safeParse({
                ...validPayload,
                billingInterval: 'none',
            });

        expect(result.success).toBe(false);
    });

    it('refuse un identifiant de workspace invalide', () => {
        const result =
            grantTrialBodySchema.safeParse({
                ...validPayload,
                workspaceId: 'invalid',
            });

        expect(result.success).toBe(false);
    });

    it('refuse les champs non autorisés', () => {
        const result =
            grantTrialBodySchema.safeParse({
                ...validPayload,
                trialDurationDays: 30,
            });

        expect(result.success).toBe(false);
    });
});


describe('updatePlatformSubscriptionBodySchema', () => {
    it('accepte une modification administrative valide', () => {
        const result =
            updatePlatformSubscriptionBodySchema.safeParse({
                discountType: 'percentage',
                discountValue: 20,
                discountReason: 'Offre commerciale',
            });

        expect(result.success).toBe(true);
    });

    it('refuse un body vide', () => {
        const result =
            updatePlatformSubscriptionBodySchema.safeParse({});

        expect(result.success).toBe(false);
    });

    it('refuse un champ non autorisé', () => {
        const result =
            updatePlatformSubscriptionBodySchema.safeParse({
                status: 'active',
            });

        expect(result.success).toBe(false);
    });

    it('refuse un pourcentage supérieur à 100', () => {
        const result =
            updatePlatformSubscriptionBodySchema.safeParse({
                discountType: 'percentage',
                discountValue: 101,
                discountReason: 'Offre commerciale',
            });

        expect(result.success).toBe(false);
    });

    it('exige un motif lorsqu’une remise est appliquée', () => {
        const result =
            updatePlatformSubscriptionBodySchema.safeParse({
                discountType: 'fixed_amount',
                discountValue: 500,
            });

        expect(result.success).toBe(false);
    });

    it('exige un motif lorsqu’une dérogation manuelle est activée', () => {
        const result =
            updatePlatformSubscriptionBodySchema.safeParse({
                manualOverride: true,
            });

        expect(result.success).toBe(false);
    });

    it('accepte une annulation immédiate valide', () => {
        const result =
            cancelPlatformSubscriptionBodySchema.safeParse({
                mode: 'immediate',
                reason: 'Résiliation administrative',
            });

        expect(result.success).toBe(true);
    });

    it('refuse un mode d’annulation inconnu', () => {
        const result =
            cancelPlatformSubscriptionBodySchema.safeParse({
                mode: 'later',
                reason: 'Résiliation administrative',
            });

        expect(result.success).toBe(false);
    });

    it('refuse une annulation sans motif', () => {
        const result =
            cancelPlatformSubscriptionBodySchema.safeParse({
                mode: 'period_end',
                reason: '',
            });

        expect(result.success).toBe(false);
    });
});
