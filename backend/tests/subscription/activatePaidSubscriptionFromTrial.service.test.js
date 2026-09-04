import mongoose from 'mongoose';

import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';

import {
    PLAN_STATUS,
    PLAN_SYSTEM_ROLE,
} from '../../constants/plan.constants.js';

import {
    BILLING_INTERVAL,
    BILLING_PROVIDER,
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_STATUS,
} from '../../constants/subscription.constants.js';

import {
    createAuditLog,
} from '../../modules/auditLog/auditLog.service.js';

import {
    Plan,
} from '../../modules/plan/plan.model.js';

import {
    activatePaidSubscriptionFromTrial,
} from '../../modules/subscriptions/services/activatePaidSubscriptionFromTrial.service.js';

import {
    Subscription,
} from '../../modules/subscriptions/subscription.model.js';


vi.mock(
    '../../modules/auditLog/auditLog.service.js',
    () => ({
        createAuditLog: vi.fn(),
    }),
);

vi.mock(
    '../../modules/plan/plan.model.js',
    () => ({
        Plan: {
            findOne: vi.fn(),
        },
    }),
);

vi.mock(
    '../../modules/subscriptions/subscription.model.js',
    () => ({
        Subscription: {
            findOne: vi.fn(),
            findOneAndUpdate: vi.fn(),
        },
    }),
);


describe('activatePaidSubscriptionFromTrial', () => {
    const session = {
        id: 'mongo-session',
    };

    const workspaceId = new mongoose.Types.ObjectId();
    const actorId = new mongoose.Types.ObjectId();
    const trialPlanId = new mongoose.Types.ObjectId();
    const targetPlanId = new mongoose.Types.ObjectId();
    const subscriptionId = new mongoose.Types.ObjectId();

    const paidAt =
        new Date('2026-09-07T12:32:00.000Z');

    const trialEndsAt =
        new Date('2026-09-15T12:32:00.000Z');

    const currentPeriodEnd =
        new Date('2026-10-07T12:32:00.000Z');

    const targetPlan = {
        _id: targetPlanId,
        key: 'premium',
        status: PLAN_STATUS.ACTIVE,
        currency: 'EUR',
        priceMonthlyExclTaxMinor: 2990,
        priceYearlyExclTaxMinor: 29900,
    };

    const existingTrial = {
        _id: subscriptionId,
        workspace: workspaceId,
        plan: trialPlanId,
        kind: SUBSCRIPTION_KIND.COMMERCIAL,
        status: SUBSCRIPTION_STATUS.TRIALING,
        trialEndsAt,
    };

    const activatedSubscription = {
        _id: subscriptionId,
        workspace: workspaceId,
        plan: targetPlanId,
        kind: SUBSCRIPTION_KIND.COMMERCIAL,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        currentPeriodStart: paidAt,
        currentPeriodEnd,
        trialEndsAt,
        billingInterval: BILLING_INTERVAL.MONTHLY,
        currency: 'EUR',
        priceExclTaxMinor: 2990,
        provider: BILLING_PROVIDER.STRIPE,
        providerCustomerId: 'cus_123',
        providerSubscriptionId: 'sub_123',
        createdAt: new Date('2026-09-01T12:00:00.000Z'),
        updatedAt: paidAt,
    };

    const buildSessionQuery = (value) => ({
        session: vi.fn().mockResolvedValue(value),
    });

    const buildParams = (overrides = {}) => ({
        workspaceId,
        planId: targetPlanId,
        billingInterval: BILLING_INTERVAL.MONTHLY,
        paidAt,
        provider: BILLING_PROVIDER.STRIPE,
        actorId,
        providerCustomerId: 'cus_123',
        providerSubscriptionId: 'sub_123',
        ipAddress: '127.0.0.1',
        userAgent: 'vitest',
        ...overrides,
    });

    beforeEach(() => {
        vi.clearAllMocks();

        vi.spyOn(
            mongoose.connection,
            'transaction',
        ).mockImplementation(
            async (callback) => callback(session),
        );

        Plan.findOne.mockReturnValue(
            buildSessionQuery(targetPlan),
        );

        Subscription.findOne.mockReturnValue(
            buildSessionQuery(existingTrial),
        );

        Subscription.findOneAndUpdate.mockResolvedValue(
            activatedSubscription,
        );

        createAuditLog.mockResolvedValue({
            _id: new mongoose.Types.ObjectId(),
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('active immédiatement le plan payant à la date exacte du paiement', async () => {
        const result = await activatePaidSubscriptionFromTrial(
            buildParams(),
        );

        expect(Plan.findOne).toHaveBeenCalledWith({
            _id: targetPlanId,
            status: PLAN_STATUS.ACTIVE,
        });

        expect(Subscription.findOneAndUpdate)
            .toHaveBeenCalledOnce();

        expect(Subscription.findOneAndUpdate)
            .toHaveBeenCalledWith(
                {
                    _id: subscriptionId,
                    workspace: workspaceId,
                    kind: SUBSCRIPTION_KIND.COMMERCIAL,
                    status: SUBSCRIPTION_STATUS.TRIALING,
                    trialEndsAt: mongoose.trusted({
                        $type: 'date',
                        $gt: paidAt,
                    }),
                },
                {
                    $set: {
                        plan: targetPlanId,
                        status: SUBSCRIPTION_STATUS.ACTIVE,
                        currentPeriodStart: paidAt,
                        currentPeriodEnd,
                        cancelAtPeriodEnd: false,
                        billingInterval: BILLING_INTERVAL.MONTHLY,
                        currency: 'EUR',
                        priceExclTaxMinor: 2990,
                        provider: BILLING_PROVIDER.STRIPE,
                        providerCustomerId: 'cus_123',
                        providerSubscriptionId: 'sub_123',
                        updatedBy: actorId,
                    },
                },
                {
                    returnDocument: 'after',
                    runValidators: true,
                    session,
                },
            );

        expect(result).toMatchObject({
            id: subscriptionId.toString(),
            workspace: workspaceId.toString(),
            plan: targetPlanId.toString(),
            status: SUBSCRIPTION_STATUS.ACTIVE,
            currentPeriodStart: paidAt,
            currentPeriodEnd,
            trialEndsAt,
            billingInterval: BILLING_INTERVAL.MONTHLY,
            priceExclTaxMinor: 2990,
        });
    });

    it('autorise un plan cible différent de celui testé sans recréer la Subscription', async () => {
        await activatePaidSubscriptionFromTrial(
            buildParams(),
        );

        expect(Subscription.findOneAndUpdate)
            .toHaveBeenCalledWith(
                expect.objectContaining({
                    _id: existingTrial._id,
                }),
                expect.objectContaining({
                    $set: expect.objectContaining({
                        plan: targetPlanId,
                    }),
                }),
                expect.any(Object),
            );
    });

    it('utilise le tarif annuel et une année calendaire pour une annualisation', async () => {
        const annualPeriodEnd =
            new Date('2027-09-07T12:32:00.000Z');

        Subscription.findOneAndUpdate.mockResolvedValue({
            ...activatedSubscription,
            currentPeriodEnd: annualPeriodEnd,
            billingInterval: BILLING_INTERVAL.YEARLY,
            priceExclTaxMinor: 29900,
        });

        await activatePaidSubscriptionFromTrial(
            buildParams({
                billingInterval: BILLING_INTERVAL.YEARLY,
            }),
        );

        expect(Subscription.findOneAndUpdate)
            .toHaveBeenCalledWith(
                expect.any(Object),
                {
                    $set: expect.objectContaining({
                        currentPeriodStart: paidAt,
                        currentPeriodEnd: annualPeriodEnd,
                        billingInterval: BILLING_INTERVAL.YEARLY,
                        priceExclTaxMinor: 29900,
                    }),
                },
                expect.any(Object),
            );
    });

    it('conserve trialEndsAt comme historique sans le réécrire', async () => {
        await activatePaidSubscriptionFromTrial(
            buildParams(),
        );

        const update =
            Subscription.findOneAndUpdate.mock.calls[0][1];

        expect(update.$set).not.toHaveProperty('trialEndsAt');
        expect(activatedSubscription.trialEndsAt)
            .toBe(trialEndsAt);
    });

    it('journalise la conversion payante dans la même transaction', async () => {
        await activatePaidSubscriptionFromTrial(
            buildParams(),
        );

        expect(createAuditLog).toHaveBeenCalledWith(
            {
                actor: actorId,
                workspace: workspaceId,
                action:
                    AUDIT_ACTION.SUBSCRIPTION_ACTIVATED_FROM_TRIAL,
                entityType:
                    AUDIT_ENTITY_TYPE.SUBSCRIPTION,
                entityId: subscriptionId,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress: '127.0.0.1',
                userAgent: 'vitest',
                metadata: {
                    reason: 'trial_converted_to_paid',
                    previousStatus:
                        SUBSCRIPTION_STATUS.TRIALING,
                    newStatus:
                        SUBSCRIPTION_STATUS.ACTIVE,
                    previousPlanId:
                        trialPlanId.toString(),
                    newPlanId:
                        targetPlanId.toString(),
                    billingInterval:
                        BILLING_INTERVAL.MONTHLY,
                    paidAt,
                    currentPeriodEnd,
                    trialEndsAt,
                    trialHistoryPreserved: true,
                    trialEligibilityPreserved: true,
                    provider: BILLING_PROVIDER.STRIPE,
                },
            },
            { session },
        );
    });

    it('refuse le plan baseline comme cible payante indépendamment de sa clé', async () => {
        Plan.findOne.mockReturnValue(
            buildSessionQuery({
                ...targetPlan,
                key: 'reference-technique',
                systemRole: PLAN_SYSTEM_ROLE.BASELINE,
            }),
        );

        await expect(
            activatePaidSubscriptionFromTrial(
                buildParams(),
            ),
        ).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(Subscription.findOne)
            .not.toHaveBeenCalled();
    });

    it('refuse un trial déjà expiré à la date du paiement', async () => {
        Subscription.findOne.mockReturnValue(
            buildSessionQuery({
                ...existingTrial,
                trialEndsAt: paidAt,
            }),
        );

        await expect(
            activatePaidSubscriptionFromTrial(
                buildParams(),
            ),
        ).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(Subscription.findOneAndUpdate)
            .not.toHaveBeenCalled();
    });

    it('refuse une date de paiement invalide avant toute transaction', async () => {
        await expect(
            activatePaidSubscriptionFromTrial(
                buildParams({
                    paidAt: new Date('invalid'),
                }),
            ),
        ).rejects.toBeInstanceOf(TypeError);

        expect(mongoose.connection.transaction)
            .not.toHaveBeenCalled();
    });

    it('refuse une périodicité non payante avant toute transaction', async () => {
        await expect(
            activatePaidSubscriptionFromTrial(
                buildParams({
                    billingInterval: BILLING_INTERVAL.NONE,
                }),
            ),
        ).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(mongoose.connection.transaction)
            .not.toHaveBeenCalled();
    });

    it('refuse une activation concurrente et ne crée aucun audit trompeur', async () => {
        Subscription.findOneAndUpdate.mockResolvedValue(null);

        await expect(
            activatePaidSubscriptionFromTrial(
                buildParams(),
            ),
        ).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(createAuditLog).not.toHaveBeenCalled();
    });

    it('propage une erreur d’audit afin que la transaction puisse être annulée', async () => {
        createAuditLog.mockRejectedValue(
            new Error('audit failure'),
        );

        await expect(
            activatePaidSubscriptionFromTrial(
                buildParams(),
            ),
        ).rejects.toThrow('audit failure');
    });
});
