import mongoose from 'mongoose';

import {
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
} from '../../../constants/auditActions.constants.js';

import {
    PLAN_STATUS,
} from '../../../constants/plan.constants.js';

import {
    BILLING_INTERVAL,
    DISCOUNT_TYPE,
    SUBSCRIPTION_STATUS,
} from '../../../constants/subscription.constants.js';

import {
    createAuditLog,
} from '../../../modules/auditLog/auditLog.service.js';

import {
    Plan,
} from '../../../modules/plan/plan.model.js';

import {
    Subscription,
} from '../../../modules/subscriptions/subscription.model.js';

import {
    updatePlatformSubscription,
} from '../../../modules/platform/subscriptions/services/updatePlatformSubscription.service.js';


vi.mock(
    '../../../modules/auditLog/auditLog.service.js',
    () => ({
        createAuditLog: vi.fn(),
    }),
);

vi.mock(
    '../../../modules/plan/plan.model.js',
    () => ({
        Plan: {
            findOne: vi.fn(),
        },
    }),
);

vi.mock(
    '../../../modules/subscriptions/subscription.model.js',
    () => ({
        Subscription: {
            findById: vi.fn(),
            findByIdAndUpdate: vi.fn(),
        },
    }),
);


describe('updatePlatformSubscription', () => {
    const actorId =
        '507f1f77bcf86cd799439011';

    const subscriptionId =
        '507f191e810c19729de860ea';

    const workspaceId =
        '507f191e810c19729de860eb';

    const currentPlanId =
        '507f191e810c19729de860ec';

    const targetPlanId =
        '507f191e810c19729de860ed';

    const session = {
        id: 'mongo-session',
    };

    const currentSubscription = {
        _id: {
            toString: () => subscriptionId,
        },
        workspace: {
            toString: () => workspaceId,
        },
        plan: {
            toString: () => currentPlanId,
        },
        status: SUBSCRIPTION_STATUS.ACTIVE,
        currentPeriodStart:
            new Date('2026-08-01T00:00:00.000Z'),
        currentPeriodEnd: null,
        trialEndsAt: null,
        cancelAtPeriodEnd: false,
        billingInterval:
            BILLING_INTERVAL.MONTHLY,
        currency: 'EUR',
        priceExclTaxMinor: 1990,
        provider: 'manual',
        discountType:
            DISCOUNT_TYPE.NONE,
        discountValue: 0,
        discountReason: null,
        discountEndsAt: null,
        manualOverride: false,
        manualOverrideReason: null,
        manualOverrideBy: null,
        createdAt:
            new Date('2026-08-01T00:00:00.000Z'),
        updatedAt:
            new Date('2026-08-01T00:00:00.000Z'),
    };

    const targetPlan = {
        _id: targetPlanId,
        key: 'premium',
        status: PLAN_STATUS.ACTIVE,
        currency: 'EUR',
        priceMonthlyExclTaxMinor: 2990,
        priceYearlyExclTaxMinor: 29900,
    };

    const updatedSubscription = {
        ...currentSubscription,
        plan: {
            toString: () => targetPlanId,
        },
        priceExclTaxMinor: 2990,
        updatedAt:
            new Date('2026-08-27T12:00:00.000Z'),
    };


    beforeEach(() => {
        vi.clearAllMocks();

        vi.spyOn(
            mongoose.connection,
            'transaction',
        ).mockImplementation(
            async (callback) =>
                callback(session),
        );

        Subscription.findById
            .mockReturnValue({
                session:
                    vi.fn()
                        .mockResolvedValue(
                            currentSubscription,
                        ),
            });

        Subscription.findByIdAndUpdate
            .mockResolvedValue(
                updatedSubscription,
            );

        Plan.findOne
            .mockReturnValue({
                session:
                    vi.fn()
                        .mockResolvedValue(
                            targetPlan,
                        ),
            });

        createAuditLog
            .mockResolvedValue({
                _id: 'audit-id',
            });
    });


    it('refuse les paramètres obligatoires manquants', async () => {
        await expect(
            updatePlatformSubscription({
                subscriptionId: null,
                subscriptionData: {
                    cancelAtPeriodEnd: true,
                },
                actorId,
            }),
        ).rejects.toBeInstanceOf(
            TypeError,
        );

        expect(
            Subscription.findById,
        ).not.toHaveBeenCalled();
    });


    it('retourne 404 lorsque la souscription n’existe pas', async () => {
        Subscription.findById
            .mockReturnValue({
                session:
                    vi.fn()
                        .mockResolvedValue(
                            null,
                        ),
            });

        await expect(
            updatePlatformSubscription({
                subscriptionId,
                subscriptionData: {
                    cancelAtPeriodEnd: true,
                },
                actorId,
            }),
        ).rejects.toMatchObject({
            statusCode: 404,
        });

        expect(
            createAuditLog,
        ).not.toHaveBeenCalled();
    });


    it('snapshotte le tarif mensuel lors d’un changement de plan', async () => {
        await updatePlatformSubscription({
            subscriptionId,
            subscriptionData: {
                plan: targetPlanId,
                billingInterval:
                    BILLING_INTERVAL.MONTHLY,
            },
            actorId,
        });

        expect(
            Plan.findOne,
        ).toHaveBeenCalledWith({
            _id: targetPlanId,
            status: PLAN_STATUS.ACTIVE,
        });

        expect(
            Subscription.findByIdAndUpdate,
        ).toHaveBeenCalledWith(
            subscriptionId,
            {
                $set: expect.objectContaining({
                    plan: targetPlanId,
                    billingInterval:
                        BILLING_INTERVAL.MONTHLY,
                    currency: 'EUR',
                    priceExclTaxMinor: 2990,
                    updatedBy: actorId,
                }),
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );
    });


    it('refuse un plan inexistant ou indisponible', async () => {
        Plan.findOne
            .mockReturnValue({
                session:
                    vi.fn()
                        .mockResolvedValue(
                            null,
                        ),
            });

        await expect(
            updatePlatformSubscription({
                subscriptionId,
                subscriptionData: {
                    plan: targetPlanId,
                    billingInterval:
                        BILLING_INTERVAL.MONTHLY,
                },
                actorId,
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(
            Subscription.findByIdAndUpdate,
        ).not.toHaveBeenCalled();
    });


    it('normalise une suppression de remise', async () => {
        await updatePlatformSubscription({
            subscriptionId,
            subscriptionData: {
                discountType:
                    DISCOUNT_TYPE.NONE,
            },
            actorId,
        });

        expect(
            Subscription.findByIdAndUpdate,
        ).toHaveBeenCalledWith(
            subscriptionId,
            {
                $set: expect.objectContaining({
                    discountType:
                        DISCOUNT_TYPE.NONE,
                    discountValue: 0,
                    discountReason: null,
                    discountEndsAt: null,
                    updatedBy: actorId,
                }),
            },
            expect.any(Object),
        );
    });


    it('refuse une remise fixe supérieure au prix HT', async () => {
        await expect(
            updatePlatformSubscription({
                subscriptionId,
                subscriptionData: {
                    discountType:
                        DISCOUNT_TYPE.FIXED_AMOUNT,
                    discountValue: 2000,
                    discountReason:
                        'Geste commercial',
                },
                actorId,
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(
            Subscription.findByIdAndUpdate,
        ).not.toHaveBeenCalled();
    });


    it('enregistre l’auteur d’une dérogation manuelle', async () => {
        await updatePlatformSubscription({
            subscriptionId,
            subscriptionData: {
                manualOverride: true,
                manualOverrideReason:
                    'Partenariat commercial',
            },
            actorId,
        });

        expect(
            Subscription.findByIdAndUpdate,
        ).toHaveBeenCalledWith(
            subscriptionId,
            {
                $set: expect.objectContaining({
                    manualOverride: true,
                    manualOverrideReason:
                        'Partenariat commercial',
                    manualOverrideBy:
                        actorId,
                    updatedBy:
                        actorId,
                }),
            },
            expect.any(Object),
        );
    });


    it('nettoie les informations de dérogation lors de sa désactivation', async () => {
        await updatePlatformSubscription({
            subscriptionId,
            subscriptionData: {
                manualOverride: false,
            },
            actorId,
        });

        expect(
            Subscription.findByIdAndUpdate,
        ).toHaveBeenCalledWith(
            subscriptionId,
            {
                $set: expect.objectContaining({
                    manualOverride: false,
                    manualOverrideReason: null,
                    manualOverrideBy: null,
                }),
            },
            expect.any(Object),
        );
    });


    it('crée l’AuditLog dans la même transaction', async () => {
        const subscriptionData = {
            cancelAtPeriodEnd: true,
        };

        await updatePlatformSubscription({
            subscriptionId,
            subscriptionData,
            actorId,
            ipAddress: '127.0.0.1',
            userAgent: 'vitest-agent',
        });

        expect(
            createAuditLog,
        ).toHaveBeenCalledWith(
            {
                actor: actorId,
                action:
                    AUDIT_ACTION.SUBSCRIPTION_UPDATED,
                entityType:
                    AUDIT_ENTITY_TYPE.SUBSCRIPTION,
                entityId:
                    updatedSubscription._id,
                status:
                    AUDIT_STATUS.SUCCESS,
                ipAddress: '127.0.0.1',
                userAgent: 'vitest-agent',
                metadata: {
                    updatedFields: [
                        'cancelAtPeriodEnd',
                    ],
                    previousPlanId:
                        currentPlanId,
                    newPlanId:
                        targetPlanId,
                },
            },
            {
                session,
            },
        );
    });


    it('propage une erreur de création de l’AuditLog', async () => {
        const error =
            new Error('Audit failure');

        createAuditLog
            .mockRejectedValue(error);

        await expect(
            updatePlatformSubscription({
                subscriptionId,
                subscriptionData: {
                    cancelAtPeriodEnd: true,
                },
                actorId,
            }),
        ).rejects.toBe(error);
    });
});