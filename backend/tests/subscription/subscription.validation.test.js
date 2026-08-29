import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    grantTrialBodySchema,
    scheduleCancellationBodySchema,
    scheduleDowngradeBodySchema,
    workspaceSubscriptionParamsSchema,
} from '../../modules/subscriptions/subscription.validation.js';

const objectId = '507f1f77bcf86cd799439011';

describe('subscription.validation', () => {
    it('accepte un trial mensuel ou annuel uniquement', () => {
        expect(grantTrialBodySchema.safeParse({
            planId: objectId,
            billingInterval: 'monthly',
        }).success).toBe(true);

        expect(grantTrialBodySchema.safeParse({
            planId: objectId,
            billingInterval: 'none',
        }).success).toBe(false);
    });

    it('valide ensemble workspaceId et subscriptionId', () => {
        expect(workspaceSubscriptionParamsSchema.safeParse({
            workspaceId: objectId,
            subscriptionId: '507f1f77bcf86cd799439012',
        }).success).toBe(true);

        expect(workspaceSubscriptionParamsSchema.safeParse({
            workspaceId: objectId,
            subscriptionId: 'invalid',
        }).success).toBe(false);
    });

    it('autorise une annulation programmée sans body', () => {
        const result = scheduleCancellationBodySchema.safeParse(undefined);

        expect(result.success).toBe(true);
        expect(result.data).toEqual({});
    });

    it('refuse les champs inconnus dans les commandes', () => {
        expect(scheduleCancellationBodySchema.safeParse({
            reason: 'Fin de besoin',
            providerCustomerId: 'forbidden',
        }).success).toBe(false);

        expect(scheduleDowngradeBodySchema.safeParse({
            targetPlanId: objectId,
            priceExclTaxMinor: 0,
        }).success).toBe(false);
    });
});
