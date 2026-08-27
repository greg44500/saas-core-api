import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    platformSubscriptionIdParamsSchema,
} from '../../../modules/platform/subscriptions/platformSubscriptions.validation.js';


describe('platformSubscriptionIdParamsSchema', () => {
    it('accepte un subscriptionId MongoDB valide', () => {
        const result =
            platformSubscriptionIdParamsSchema.safeParse({
                subscriptionId:
                    '507f1f77bcf86cd799439011',
            });

        expect(result.success).toBe(true);
    });


    it('refuse un subscriptionId invalide', () => {
        const result =
            platformSubscriptionIdParamsSchema.safeParse({
                subscriptionId:
                    'invalid-subscription-id',
            });

        expect(result.success).toBe(false);
    });


    it('refuse une propriété inconnue', () => {
        const result =
            platformSubscriptionIdParamsSchema.safeParse({
                subscriptionId:
                    '507f1f77bcf86cd799439011',
                unexpected: true,
            });

        expect(result.success).toBe(false);
    });
});