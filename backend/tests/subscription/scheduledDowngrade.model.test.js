import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';

import {
    BILLING_INTERVAL,
    BILLING_PROVIDER,
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_PLAN_CHANGE_TYPE,
    SUBSCRIPTION_STATUS,
} from '../../constants/subscription.constants.js';
import { Subscription } from '../../modules/subscriptions/subscription.model.js';

const { ObjectId } = mongoose.Types;

const createValidSubscription = (overrides = {}) => new Subscription({
    workspace: new ObjectId(),
    plan: new ObjectId(),
    kind: SUBSCRIPTION_KIND.COMMERCIAL,
    status: SUBSCRIPTION_STATUS.ACTIVE,
    currentPeriodStart: new Date('2026-08-29T10:00:00.000Z'),
    currentPeriodEnd: new Date('2026-09-29T10:00:00.000Z'),
    billingInterval: BILLING_INTERVAL.MONTHLY,
    currency: 'EUR',
    priceExclTaxMinor: 7900,
    provider: BILLING_PROVIDER.MANUAL,
    ...overrides,
});

describe('Subscription scheduledChange', () => {
    it('accepte un downgrade programmé complet sans modifier le plan courant', () => {
        const currentPlanId = new ObjectId();
        const targetPlanId = new ObjectId();
        const actorId = new ObjectId();
        const effectiveAt = new Date('2026-09-29T10:00:00.000Z');
        const requestedAt = new Date('2026-08-29T12:00:00.000Z');

        const subscription = createValidSubscription({
            plan: currentPlanId,
            scheduledChange: {
                type: SUBSCRIPTION_PLAN_CHANGE_TYPE.DOWNGRADE,
                targetPlan: targetPlanId,
                targetBillingInterval: BILLING_INTERVAL.MONTHLY,
                targetCurrency: 'EUR',
                targetPriceExclTaxMinor: 4900,
                effectiveAt,
                requestedAt,
                requestedBy: actorId,
            },
        });

        const error = subscription.validateSync();

        expect(error).toBeUndefined();
        expect(subscription.plan).toEqual(currentPlanId);
        expect(subscription.scheduledChange.targetPlan)
            .toEqual(targetPlanId);
        expect(subscription.scheduledChange._id).toBeUndefined();
    });

    it('refuse un prix cible négatif', () => {
        const subscription = createValidSubscription({
            scheduledChange: {
                type: SUBSCRIPTION_PLAN_CHANGE_TYPE.DOWNGRADE,
                targetPlan: new ObjectId(),
                targetBillingInterval: BILLING_INTERVAL.MONTHLY,
                targetCurrency: 'EUR',
                targetPriceExclTaxMinor: -1,
                effectiveAt: new Date('2026-09-29T10:00:00.000Z'),
                requestedAt: new Date('2026-08-29T12:00:00.000Z'),
                requestedBy: new ObjectId(),
            },
        });

        const error = subscription.validateSync();

        expect(error?.errors['scheduledChange.targetPriceExclTaxMinor'])
            .toBeDefined();
    });

    it('refuse une périodicité cible inconnue', () => {
        const subscription = createValidSubscription({
            scheduledChange: {
                type: SUBSCRIPTION_PLAN_CHANGE_TYPE.DOWNGRADE,
                targetPlan: new ObjectId(),
                targetBillingInterval: 'weekly',
                targetCurrency: 'EUR',
                targetPriceExclTaxMinor: 4900,
                effectiveAt: new Date('2026-09-29T10:00:00.000Z'),
                requestedAt: new Date('2026-08-29T12:00:00.000Z'),
                requestedBy: new ObjectId(),
            },
        });

        const error = subscription.validateSync();

        expect(error?.errors['scheduledChange.targetBillingInterval'])
            .toBeDefined();
    });
});