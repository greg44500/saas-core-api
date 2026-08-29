import mongoose from 'mongoose';
import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    serializePlan,
    serializeSubscription,
} from '../../modules/subscriptions/services/getWorkspaceSubscriptionOverview.service.js';

const { ObjectId } = mongoose.Types;

const buildPlan = () => ({
    _id: new ObjectId(),
    key: 'pro',
    name: 'Pro',
    features: ['file_upload', 'export_pdf'],
    limits: new Map([
        ['members', 10],
        ['storage_bytes', 1024],
    ]),
    currency: 'EUR',
    priceMonthlyExclTaxMinor: 2900,
});

describe('workspace subscription overview projection', () => {
    it('n’expose que les capacités non financières du plan', () => {
        const result = serializePlan(buildPlan());

        expect(result).toEqual({
            id: expect.any(String),
            key: 'pro',
            name: 'Pro',
            features: ['file_upload', 'export_pdf'],
            limits: {
                members: 10,
                storage_bytes: 1024,
            },
        });

        expect(result).not.toHaveProperty('currency');
        expect(result).not.toHaveProperty('priceMonthlyExclTaxMinor');
        expect(result).not.toHaveProperty('priceYearlyExclTaxMinor');
    });

    it('n’expose aucune donnée de paiement ou de provider depuis Subscription', () => {
        const plan = buildPlan();
        const targetPlan = buildPlan();
        const subscription = {
            _id: new ObjectId(),
            kind: 'commercial',
            status: 'active',
            plan,
            currentPeriodStart: new Date('2026-08-01T00:00:00.000Z'),
            currentPeriodEnd: new Date('2026-09-01T00:00:00.000Z'),
            trialEndsAt: null,
            cancelAtPeriodEnd: false,
            billingInterval: 'monthly',
            currency: 'EUR',
            priceExclTaxMinor: 2900,
            provider: 'stripe',
            providerCustomerId: 'cus_secret',
            providerSubscriptionId: 'sub_secret',
            discountType: 'percent',
            discountValue: 20,
            scheduledChange: {
                type: 'downgrade',
                targetPlan,
                targetBillingInterval: 'monthly',
                targetCurrency: 'EUR',
                targetPriceExclTaxMinor: 1900,
                effectiveAt: new Date('2026-09-01T00:00:00.000Z'),
                requestedAt: new Date('2026-08-20T00:00:00.000Z'),
                requestedBy: new ObjectId(),
            },
        };

        const result = serializeSubscription(subscription);

        expect(result.status).toBe('active');
        expect(result.plan.key).toBe('pro');
        expect(result.scheduledChange.targetPlan.key).toBe('pro');
        expect(result.scheduledChange.targetBillingInterval).toBe('monthly');

        expect(result).not.toHaveProperty('currency');
        expect(result).not.toHaveProperty('priceExclTaxMinor');
        expect(result).not.toHaveProperty('provider');
        expect(result).not.toHaveProperty('providerCustomerId');
        expect(result).not.toHaveProperty('providerSubscriptionId');
        expect(result).not.toHaveProperty('discountType');
        expect(result).not.toHaveProperty('discountValue');
        expect(result.scheduledChange).not.toHaveProperty('targetCurrency');
        expect(result.scheduledChange).not.toHaveProperty(
            'targetPriceExclTaxMinor',
        );
        expect(result.scheduledChange).not.toHaveProperty('requestedBy');
    });
});