import mongoose from 'mongoose';

import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { AUDIT_ACTION } from '../../constants/auditActions.constants.js';
import {
    BILLING_INTERVAL,
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_PLAN_CHANGE_TYPE,
    SUBSCRIPTION_STATUS,
} from '../../constants/subscription.constants.js';
import {
    PLAN_STATUS,
    PLAN_SYSTEM_ROLE,
} from '../../constants/plan.constants.js';
import { createAuditLog } from '../../modules/auditLog/auditLog.service.js';
import { Plan } from '../../modules/plan/plan.model.js';
import { Subscription } from '../../modules/subscriptions/subscription.model.js';
import {
    revokeScheduledSubscriptionDowngrade,
    scheduleSubscriptionDowngrade,
} from '../../modules/subscriptions/services/scheduledDowngrade.service.js';

vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: vi.fn(),
}));

const { ObjectId } = mongoose.Types;

const NOW = new Date('2026-08-29T14:00:00.000Z');
const PERIOD_END = new Date('2026-09-29T14:00:00.000Z');

const queryResult = (value) => ({
    session: vi.fn().mockResolvedValue(value),
});

const createPlan = ({
    id = new ObjectId(),
    key = 'premium',
    systemRole = null,
    status = PLAN_STATUS.ACTIVE,
    currency = 'EUR',
    monthly = 7900,
    yearly = 79000,
} = {}) => ({
    _id: id,
    key,
    systemRole,
    status,
    currency,
    priceMonthlyExclTaxMinor: monthly,
    priceYearlyExclTaxMinor: yearly,
});

const createSubscription = (overrides = {}) => ({
    _id: new ObjectId(),
    workspace: new ObjectId(),
    plan: new ObjectId(),
    kind: SUBSCRIPTION_KIND.COMMERCIAL,
    status: SUBSCRIPTION_STATUS.ACTIVE,
    currentPeriodStart: new Date('2026-08-29T10:00:00.000Z'),
    currentPeriodEnd: PERIOD_END,
    cancelAtPeriodEnd: false,
    scheduledChange: null,
    billingInterval: BILLING_INTERVAL.MONTHLY,
    currency: 'EUR',
    priceExclTaxMinor: 6900,
    ...overrides,
});

const mockPlans = ({ currentPlan, targetPlan }) => {
    vi.spyOn(Plan, 'findById')
        .mockReturnValueOnce(queryResult(currentPlan))
        .mockReturnValueOnce(queryResult(targetPlan));
};

describe('scheduled downgrade lifecycle', () => {
    beforeEach(() => {
        vi.spyOn(mongoose.connection, 'transaction')
            .mockImplementation(async (callback) => callback({ id: 'session' }));
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });

    it('programme un downgrade à currentPeriodEnd et snapshotte le tarif cible', async () => {
        const actorId = new ObjectId();
        const subscription = createSubscription();
        const currentPlan = createPlan({
            id: subscription.plan,
            monthly: 7900,
        });
        const targetPlan = createPlan({
            key: 'starter',
            monthly: 4900,
        });
        const scheduledChange = {
            type: SUBSCRIPTION_PLAN_CHANGE_TYPE.DOWNGRADE,
            targetPlan: targetPlan._id,
            targetBillingInterval: BILLING_INTERVAL.MONTHLY,
            targetCurrency: 'EUR',
            targetPriceExclTaxMinor: 4900,
            effectiveAt: PERIOD_END,
            requestedAt: NOW,
            requestedBy: actorId,
        };
        const updated = createSubscription({
            ...subscription,
            scheduledChange,
        });

        vi.spyOn(Subscription, 'findById')
            .mockReturnValue(queryResult(subscription));
        mockPlans({ currentPlan, targetPlan });
        const updateSpy = vi.spyOn(Subscription, 'findOneAndUpdate')
            .mockResolvedValue(updated);
        createAuditLog.mockResolvedValue({});

        const result = await scheduleSubscriptionDowngrade({
            subscriptionId: subscription._id,
            targetPlanId: targetPlan._id,
            actorId,
            now: NOW,
        });

        expect(result.plan).toBe(subscription.plan.toString());
        expect(result.scheduledChange).toMatchObject({
            type: SUBSCRIPTION_PLAN_CHANGE_TYPE.DOWNGRADE,
            targetPlan: targetPlan._id.toString(),
            targetBillingInterval: BILLING_INTERVAL.MONTHLY,
            targetCurrency: 'EUR',
            targetPriceExclTaxMinor: 4900,
            effectiveAt: PERIOD_END,
            requestedAt: NOW,
            requestedBy: actorId.toString(),
        });

        expect(updateSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                _id: subscription._id,
                scheduledChange: null,
            }),
            expect.objectContaining({
                $set: expect.objectContaining({
                    scheduledChange: expect.objectContaining({
                        targetPriceExclTaxMinor: 4900,
                        effectiveAt: PERIOD_END,
                    }),
                }),
            }),
            expect.objectContaining({
                runValidators: true,
                session: expect.anything(),
            }),
        );

        expect(createAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                action: AUDIT_ACTION.SUBSCRIPTION_DOWNGRADE_SCHEDULED,
                metadata: expect.objectContaining({
                    targetPlan: targetPlan._id,
                    targetPriceExclTaxMinor: 4900,
                    effectiveAt: PERIOD_END,
                }),
            }),
            expect.objectContaining({ session: expect.anything() }),
        );
    });

    it('refuse un downgrade vers le plan courant', async () => {
        const subscription = createSubscription();

        vi.spyOn(Subscription, 'findById')
            .mockReturnValue(queryResult(subscription));

        await expect(
            scheduleSubscriptionDowngrade({
                subscriptionId: subscription._id,
                targetPlanId: subscription.plan,
                actorId: new ObjectId(),
                now: NOW,
            }),
        ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('refuse un plan cible inactif', async () => {
        const subscription = createSubscription();
        const currentPlan = createPlan({ id: subscription.plan });
        const targetPlan = createPlan({
            key: 'starter',
            status: PLAN_STATUS.INACTIVE,
            monthly: 4900,
        });

        vi.spyOn(Subscription, 'findById')
            .mockReturnValue(queryResult(subscription));
        mockPlans({ currentPlan, targetPlan });

        await expect(
            scheduleSubscriptionDowngrade({
                subscriptionId: subscription._id,
                targetPlanId: targetPlan._id,
                actorId: new ObjectId(),
                now: NOW,
            }),
        ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('refuse de traiter le plan baseline comme un downgrade commercial indépendamment de sa clé', async () => {
        const subscription = createSubscription();
        const currentPlan = createPlan({ id: subscription.plan });
        const targetPlan = createPlan({
            key: 'reference-technique',
            systemRole: PLAN_SYSTEM_ROLE.BASELINE,
            monthly: 0,
            yearly: 0,
        });

        vi.spyOn(Subscription, 'findById')
            .mockReturnValue(queryResult(subscription));
        mockPlans({ currentPlan, targetPlan });

        await expect(
            scheduleSubscriptionDowngrade({
                subscriptionId: subscription._id,
                targetPlanId: targetPlan._id,
                actorId: new ObjectId(),
                now: NOW,
            }),
        ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('refuse un plan dont le prix catalogue n’est pas inférieur', async () => {
        const subscription = createSubscription();
        const currentPlan = createPlan({
            id: subscription.plan,
            monthly: 7900,
        });
        const targetPlan = createPlan({
            key: 'business',
            monthly: 9900,
        });

        vi.spyOn(Subscription, 'findById')
            .mockReturnValue(queryResult(subscription));
        mockPlans({ currentPlan, targetPlan });

        await expect(
            scheduleSubscriptionDowngrade({
                subscriptionId: subscription._id,
                targetPlanId: targetPlan._id,
                actorId: new ObjectId(),
                now: NOW,
            }),
        ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('refuse un changement de devise dans ce cycle', async () => {
        const subscription = createSubscription();
        const currentPlan = createPlan({ id: subscription.plan });
        const targetPlan = createPlan({
            key: 'starter',
            currency: 'USD',
            monthly: 4900,
        });

        vi.spyOn(Subscription, 'findById')
            .mockReturnValue(queryResult(subscription));
        mockPlans({ currentPlan, targetPlan });

        await expect(
            scheduleSubscriptionDowngrade({
                subscriptionId: subscription._id,
                targetPlanId: targetPlan._id,
                actorId: new ObjectId(),
                now: NOW,
            }),
        ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('refuse de cumuler annulation programmée et downgrade', async () => {
        const subscription = createSubscription({
            cancelAtPeriodEnd: true,
        });

        vi.spyOn(Subscription, 'findById')
            .mockReturnValue(queryResult(subscription));

        await expect(
            scheduleSubscriptionDowngrade({
                subscriptionId: subscription._id,
                targetPlanId: new ObjectId(),
                actorId: new ObjectId(),
                now: NOW,
            }),
        ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('refuse un second changement déjà programmé', async () => {
        const subscription = createSubscription({
            scheduledChange: {
                type: SUBSCRIPTION_PLAN_CHANGE_TYPE.DOWNGRADE,
            },
        });

        vi.spyOn(Subscription, 'findById')
            .mockReturnValue(queryResult(subscription));

        await expect(
            scheduleSubscriptionDowngrade({
                subscriptionId: subscription._id,
                targetPlanId: new ObjectId(),
                actorId: new ObjectId(),
                now: NOW,
            }),
        ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('refuse silencieusement aucune course concurrente lors de la programmation', async () => {
        const subscription = createSubscription();
        const currentPlan = createPlan({ id: subscription.plan });
        const targetPlan = createPlan({
            key: 'starter',
            monthly: 4900,
        });

        vi.spyOn(Subscription, 'findById')
            .mockReturnValue(queryResult(subscription));
        mockPlans({ currentPlan, targetPlan });
        vi.spyOn(Subscription, 'findOneAndUpdate')
            .mockResolvedValue(null);

        await expect(
            scheduleSubscriptionDowngrade({
                subscriptionId: subscription._id,
                targetPlanId: targetPlan._id,
                actorId: new ObjectId(),
                now: NOW,
            }),
        ).rejects.toMatchObject({ statusCode: 409 });

        expect(createAuditLog).not.toHaveBeenCalled();
    });

    it('révoque un downgrade avant son échéance', async () => {
        const actorId = new ObjectId();
        const targetPlanId = new ObjectId();
        const subscription = createSubscription({
            scheduledChange: {
                type: SUBSCRIPTION_PLAN_CHANGE_TYPE.DOWNGRADE,
                targetPlan: targetPlanId,
                targetBillingInterval: BILLING_INTERVAL.MONTHLY,
                targetCurrency: 'EUR',
                targetPriceExclTaxMinor: 4900,
                effectiveAt: PERIOD_END,
                requestedAt: NOW,
                requestedBy: new ObjectId(),
            },
        });
        const updated = createSubscription({
            ...subscription,
            scheduledChange: null,
        });

        vi.spyOn(Subscription, 'findById')
            .mockReturnValue(queryResult(subscription));
        vi.spyOn(Subscription, 'findOneAndUpdate')
            .mockResolvedValue(updated);
        createAuditLog.mockResolvedValue({});

        const result = await revokeScheduledSubscriptionDowngrade({
            subscriptionId: subscription._id,
            actorId,
            now: NOW,
        });

        expect(result.scheduledChange).toBeNull();
        expect(createAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                action: AUDIT_ACTION.SUBSCRIPTION_DOWNGRADE_REVOKED,
                metadata: expect.objectContaining({
                    targetPlan: targetPlanId,
                    effectiveAt: PERIOD_END,
                }),
            }),
            expect.objectContaining({ session: expect.anything() }),
        );
    });

    it('refuse de révoquer après l’échéance', async () => {
        const subscription = createSubscription({
            scheduledChange: {
                type: SUBSCRIPTION_PLAN_CHANGE_TYPE.DOWNGRADE,
                targetPlan: new ObjectId(),
                effectiveAt: NOW,
            },
        });

        vi.spyOn(Subscription, 'findById')
            .mockReturnValue(queryResult(subscription));

        await expect(
            revokeScheduledSubscriptionDowngrade({
                subscriptionId: subscription._id,
                actorId: new ObjectId(),
                now: NOW,
            }),
        ).rejects.toMatchObject({ statusCode: 409 });
    });
});