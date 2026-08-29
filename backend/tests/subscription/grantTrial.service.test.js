import mongoose from 'mongoose';

import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

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
    Role,
} from '../../modules/role/role.model.js';

import {
    Subscription,
} from '../../modules/subscriptions/subscription.model.js';

import {
    grantTrial,
} from '../../modules/subscriptions/services/grantTrial.service.js';

import {
    hasConsumedTrial,
    recordTrialConsumption,
} from '../../modules/trialEligibility/trialEligibility.service.js';

import {
    User,
} from '../../modules/users/user.model.js';

import {
    WorkspaceMember,
} from '../../modules/workspaceMember/workspaceMember.model.js';


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
    '../../modules/role/role.model.js',
    () => ({
        Role: {
            findOne: vi.fn(),
        },
    }),
);

vi.mock(
    '../../modules/subscriptions/subscription.model.js',
    () => ({
        Subscription: {
            findOne: vi.fn(),
            findByIdAndUpdate: vi.fn(),
            create: vi.fn(),
        },
    }),
);

vi.mock(
    '../../modules/trialEligibility/trialEligibility.service.js',
    () => ({
        hasConsumedTrial: vi.fn(),
        recordTrialConsumption: vi.fn(),
    }),
);

vi.mock(
    '../../modules/users/user.model.js',
    () => ({
        User: {
            findById: vi.fn(),
        },
    }),
);

vi.mock(
    '../../modules/workspaceMember/workspaceMember.model.js',
    () => ({
        WorkspaceMember: {
            findOne: vi.fn(),
        },
    }),
);


const sessionQuery = (value) => ({
    session: vi.fn().mockResolvedValue(value),
});


describe('grantTrial', () => {
    const session = {
        id: 'mongo-session',
    };

    const workspaceId =
        '507f1f77bcf86cd799439011';
    const planId =
        '507f191e810c19729de860ea';
    const actorId =
        '507f191e810c19729de860eb';
    const ownerId =
        '507f191e810c19729de860ec';

    const plan = {
        _id: planId,
        key: 'pro',
        status: 'active',
        trialEnabled: true,
        trialDurationDays: 14,
        currency: 'EUR',
        priceMonthlyExclTaxMinor: 1990,
        priceYearlyExclTaxMinor: 19900,
    };

    const owner = {
        _id: ownerId,
        emailCanonical: 'owner@example.com',
    };

    const createdSubscription = {
        _id: '507f191e810c19729de860ed',
        workspace: workspaceId,
        plan: planId,
        kind: SUBSCRIPTION_KIND.COMMERCIAL,
        status: SUBSCRIPTION_STATUS.TRIALING,
        currentPeriodStart:
            new Date('2026-08-29T10:00:00.000Z'),
        currentPeriodEnd:
            new Date('2026-09-12T10:00:00.000Z'),
        trialEndsAt:
            new Date('2026-09-12T10:00:00.000Z'),
        billingInterval: BILLING_INTERVAL.MONTHLY,
        currency: 'EUR',
        priceExclTaxMinor: 1990,
        provider: BILLING_PROVIDER.MANUAL,
        createdAt:
            new Date('2026-08-29T10:00:00.000Z'),
        updatedAt:
            new Date('2026-08-29T10:00:00.000Z'),
    };


    beforeEach(() => {
        vi.clearAllMocks();

        vi.spyOn(
            mongoose.connection,
            'transaction',
        ).mockImplementation(
            async (callback) => callback(session),
        );

        Plan.findOne.mockReturnValue(
            sessionQuery(plan),
        );

        Subscription.findOne
            .mockReturnValueOnce(
                sessionQuery(null),
            )
            .mockReturnValueOnce(
                sessionQuery(null),
            );

        Role.findOne.mockReturnValue(
            sessionQuery({
                _id: 'owner-role-id',
            }),
        );

        WorkspaceMember.findOne.mockReturnValue(
            sessionQuery({
                user: ownerId,
            }),
        );

        User.findById.mockReturnValue(
            sessionQuery(owner),
        );

        hasConsumedTrial.mockResolvedValue(false);

        Subscription.create.mockResolvedValue([
            createdSubscription,
        ]);

        recordTrialConsumption.mockResolvedValue({
            _id: 'trial-eligibility-id',
        });

        createAuditLog.mockResolvedValue({
            _id: 'audit-id',
        });
    });


    it('refuse les paramètres obligatoires manquants', async () => {
        await expect(
            grantTrial({
                workspaceId,
                planId,
                billingInterval: null,
                actorId,
            }),
        ).rejects.toBeInstanceOf(TypeError);

        expect(
            mongoose.connection.transaction,
        ).not.toHaveBeenCalled();
    });


    it('refuse le plan Free', async () => {
        Plan.findOne.mockReturnValue(
            sessionQuery({
                ...plan,
                key: 'free',
            }),
        );

        await expect(
            grantTrial({
                workspaceId,
                planId,
                billingInterval:
                    BILLING_INTERVAL.MONTHLY,
                actorId,
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(
            Subscription.create,
        ).not.toHaveBeenCalled();
    });


    it('refuse un plan sans trial actif', async () => {
        Plan.findOne.mockReturnValue(
            sessionQuery({
                ...plan,
                trialEnabled: false,
                trialDurationDays: null,
            }),
        );

        await expect(
            grantTrial({
                workspaceId,
                planId,
                billingInterval:
                    BILLING_INTERVAL.MONTHLY,
                actorId,
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });
    });


    it('crée une souscription commerciale trialing et consomme l’éligibilité', async () => {
        const result = await grantTrial({
            workspaceId,
            planId,
            billingInterval:
                BILLING_INTERVAL.MONTHLY,
            actorId,
        });

        expect(
            Subscription.create,
        ).toHaveBeenCalledOnce();

        const [documents, options] =
            Subscription.create.mock.calls[0];

        expect(documents[0]).toMatchObject({
            workspace: workspaceId,
            plan: planId,
            kind: SUBSCRIPTION_KIND.COMMERCIAL,
            status: SUBSCRIPTION_STATUS.TRIALING,
            billingInterval:
                BILLING_INTERVAL.MONTHLY,
            currency: 'EUR',
            priceExclTaxMinor: 1990,
            provider: BILLING_PROVIDER.MANUAL,
            createdBy: actorId,
            updatedBy: actorId,
        });

        expect(documents[0].trialEndsAt).toBeInstanceOf(Date);
        expect(documents[0].currentPeriodEnd).toEqual(
            documents[0].trialEndsAt,
        );
        expect(options).toEqual({ session });

        expect(
            recordTrialConsumption,
        ).toHaveBeenCalledWith({
            emailCanonical:
                owner.emailCanonical,
            userId: ownerId,
            workspaceId,
            subscriptionId:
                createdSubscription._id,
            session,
        });

        expect(result).toMatchObject({
            kind: SUBSCRIPTION_KIND.COMMERCIAL,
            status: SUBSCRIPTION_STATUS.TRIALING,
        });
    });


    it('refuse une identité ayant déjà consommé son trial', async () => {
        hasConsumedTrial.mockResolvedValue(true);

        await expect(
            grantTrial({
                workspaceId,
                planId,
                billingInterval:
                    BILLING_INTERVAL.MONTHLY,
                actorId,
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(
            Subscription.create,
        ).not.toHaveBeenCalled();

        expect(
            recordTrialConsumption,
        ).not.toHaveBeenCalled();
    });


    it('refuse un nouveau trial lorsqu’une souscription commerciale courante existe', async () => {
        Subscription.findOne
            .mockReset()
            .mockReturnValueOnce(
                sessionQuery(null),
            )
            .mockReturnValueOnce(
                sessionQuery({
                    _id: 'commercial-id',
                    status:
                        SUBSCRIPTION_STATUS.ACTIVE,
                }),
            );

        await expect(
            grantTrial({
                workspaceId,
                planId,
                billingInterval:
                    BILLING_INTERVAL.YEARLY,
                actorId,
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(
            hasConsumedTrial,
        ).not.toHaveBeenCalled();
    });


    it('change le plan d’un trial existant sans modifier son horloge', async () => {
        const preservedTrialEndsAt =
            new Date('2030-09-12T10:00:00.000Z');

        const existingTrial = {
            _id: '507f191e810c19729de860ef',
            workspace: workspaceId,
            plan: 'old-plan-id',
            kind: SUBSCRIPTION_KIND.COMMERCIAL,
            status: SUBSCRIPTION_STATUS.TRIALING,
            currentPeriodStart:
                new Date('2030-08-29T10:00:00.000Z'),
            currentPeriodEnd:
                preservedTrialEndsAt,
            trialEndsAt:
                preservedTrialEndsAt,
        };

        Subscription.findOne
            .mockReset()
            .mockReturnValueOnce(
                sessionQuery(existingTrial),
            );

        const updatedTrial = {
            ...createdSubscription,
            _id: existingTrial._id,
            billingInterval:
                BILLING_INTERVAL.YEARLY,
            priceExclTaxMinor: 19900,
            currentPeriodStart:
                existingTrial.currentPeriodStart,
            currentPeriodEnd:
                preservedTrialEndsAt,
            trialEndsAt:
                preservedTrialEndsAt,
        };

        Subscription.findByIdAndUpdate
            .mockResolvedValue(updatedTrial);

        const result = await grantTrial({
            workspaceId,
            planId,
            billingInterval:
                BILLING_INTERVAL.YEARLY,
            actorId,
        });

        expect(
            Subscription.findByIdAndUpdate,
        ).toHaveBeenCalledWith(
            existingTrial._id,
            {
                $set: {
                    plan: planId,
                    billingInterval:
                        BILLING_INTERVAL.YEARLY,
                    currency: 'EUR',
                    priceExclTaxMinor: 19900,
                    updatedBy: actorId,
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );

        expect(result.trialEndsAt).toEqual(
            preservedTrialEndsAt,
        );
        expect(
            hasConsumedTrial,
        ).not.toHaveBeenCalled();
        expect(
            recordTrialConsumption,
        ).not.toHaveBeenCalled();
        expect(
            Subscription.create,
        ).not.toHaveBeenCalled();
    });
});
