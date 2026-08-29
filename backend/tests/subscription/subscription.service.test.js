import mongoose from 'mongoose';

import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    BILLING_INTERVAL,
    BILLING_PROVIDER,
    SUBSCRIPTION_STATUS,
    SUBSCRIPTION_KIND,
} from '../../constants/subscription.constants.js';

import {
    PLAN_KEY,
    PLAN_STATUS,
} from '../../constants/plan.constants.js';

import { Plan } from '../../modules/plan/plan.model.js';

import {
    Subscription,
} from '../../modules/subscriptions/subscription.model.js';

import {
    createFreeSubscriptionForWorkspace,
    getWorkspacePlanEntitlement,
} from '../../modules/subscriptions/subscription.service.js';


const { ObjectId } = mongoose.Types;


describe('createFreeSubscriptionForWorkspace', () => {
    afterEach(() => {
        // Restaure les véritables méthodes Mongoose après chaque test.
        vi.restoreAllMocks();
    });


    it('crée la souscription gratuite dans la transaction reçue', async () => {
        const workspaceId = new ObjectId();
        const actorId = new ObjectId();
        const planId = new ObjectId();

        const session = {
            id: 'mongo-session',
        };

        const freePlan = {
            _id: planId,
            key: PLAN_KEY.FREE,
            status: PLAN_STATUS.ACTIVE,
            currency: 'EUR',
            priceMonthlyExclTaxMinor: 0,
        };

        const createdSubscription = {
            _id: new ObjectId(),
            workspace: workspaceId,
            plan: planId,
        };

        /*
         * Plan.findOne retourne normalement une Query Mongoose possédant une
         * méthode session(). Ce faux objet reproduit uniquement ce contrat.
         */
        const querySessionMock = vi
            .fn()
            .mockResolvedValue(freePlan);

        const findOneSpy = vi
            .spyOn(Plan, 'findOne')
            .mockReturnValue({
                session: querySessionMock,
            });

        const createSpy = vi
            .spyOn(Subscription, 'create')
            .mockResolvedValue([
                createdSubscription,
            ]);

        const result = await createFreeSubscriptionForWorkspace({
            workspaceId,
            actorId,
            session,
        });

        expect(findOneSpy).toHaveBeenCalledOnce();

        expect(findOneSpy).toHaveBeenCalledWith({
            key: PLAN_KEY.FREE,
            status: PLAN_STATUS.ACTIVE,
        });

        expect(querySessionMock).toHaveBeenCalledOnce();
        expect(querySessionMock).toHaveBeenCalledWith(session);

        expect(createSpy).toHaveBeenCalledOnce();

        expect(createSpy).toHaveBeenCalledWith(
            [
                {
                    workspace: workspaceId,
                    plan: planId,

                    kind: SUBSCRIPTION_KIND.BASELINE,
                    status: SUBSCRIPTION_STATUS.ACTIVE,

                    currentPeriodStart: expect.any(Date),
                    currentPeriodEnd: null,
                    trialEndsAt: null,
                    cancelAtPeriodEnd: false,

                    billingInterval: BILLING_INTERVAL.NONE,

                    currency: 'EUR',
                    priceExclTaxMinor: 0,

                    provider: BILLING_PROVIDER.MANUAL,

                    createdBy: actorId,
                    updatedBy: actorId,
                },
            ],
            {
                session,
            },
        );

        expect(result).toBe(createdSubscription);
    });


    it('refuse de créer une souscription sans session transactionnelle', async () => {
        const findOneSpy = vi.spyOn(Plan, 'findOne');
        const createSpy = vi.spyOn(Subscription, 'create');

        await expect(
            createFreeSubscriptionForWorkspace({
                workspaceId: new ObjectId(),
                actorId: new ObjectId(),
            }),
        ).rejects.toThrow(
            'workspaceId, actorId and session are required to create a free subscription',
        );

        expect(findOneSpy).not.toHaveBeenCalled();
        expect(createSpy).not.toHaveBeenCalled();
    });


    it('refuse la création lorsque le plan gratuit actif est introuvable', async () => {
        const session = {
            id: 'mongo-session',
        };

        const querySessionMock = vi
            .fn()
            .mockResolvedValue(null);

        vi.spyOn(Plan, 'findOne')
            .mockReturnValue({
                session: querySessionMock,
            });

        const createSpy = vi.spyOn(Subscription, 'create');

        await expect(
            createFreeSubscriptionForWorkspace({
                workspaceId: new ObjectId(),
                actorId: new ObjectId(),
                session,
            }),
        ).rejects.toThrow(
            'Le plan gratuit actif est introuvable. Exécutez le seed des plans.',
        );

        expect(createSpy).not.toHaveBeenCalled();
    });
});

describe('getWorkspacePlanEntitlement', () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    const createQueryMock = (result) => ({
        populate: vi.fn().mockResolvedValue(result),
    });

    it('priorise une souscription commerciale en trial encore valide sur la baseline', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-08-29T12:00:00.000Z'));

        const workspaceId = new ObjectId();

        const commercialPlan = {
            _id: new ObjectId(),
            key: 'pro',
        };

        const commercialSubscription = {
            _id: new ObjectId(),
            workspace: workspaceId,
            kind: SUBSCRIPTION_KIND.COMMERCIAL,
            status: SUBSCRIPTION_STATUS.TRIALING,
            trialEndsAt: new Date('2026-08-30T12:00:00.000Z'),
            plan: commercialPlan,
        };

        const findOneSpy = vi
            .spyOn(Subscription, 'findOne')
            .mockReturnValueOnce(createQueryMock(null))
            .mockReturnValueOnce(
                createQueryMock(commercialSubscription),
            );

        const result = await getWorkspacePlanEntitlement({
            workspaceId,
        });

        expect(findOneSpy).toHaveBeenCalledTimes(2);
        expect(findOneSpy).toHaveBeenNthCalledWith(
            1,
            {
                workspace: workspaceId,
                kind: SUBSCRIPTION_KIND.COMMERCIAL,
                status: SUBSCRIPTION_STATUS.ACTIVE,
            },
        );

        expect(findOneSpy).toHaveBeenNthCalledWith(
            2,
            {
                workspace: workspaceId,
                kind: SUBSCRIPTION_KIND.COMMERCIAL,
                status: SUBSCRIPTION_STATUS.TRIALING,
                trialEndsAt: mongoose.trusted({
                    $type: 'date',
                    $gt: new Date('2026-08-29T12:00:00.000Z'),
                }),
            },
        );

        expect(result).toEqual({
            subscription: commercialSubscription,
            plan: commercialPlan,
        });
    });

    it('priorise une souscription commerciale active sur la baseline', async () => {
        const workspaceId = new ObjectId();

        const commercialPlan = {
            _id: new ObjectId(),
            key: 'pro',
        };

        const commercialSubscription = {
            _id: new ObjectId(),
            workspace: workspaceId,
            kind: SUBSCRIPTION_KIND.COMMERCIAL,
            status: SUBSCRIPTION_STATUS.ACTIVE,
            plan: commercialPlan,
        };

        const findOneSpy = vi
            .spyOn(Subscription, 'findOne')
            .mockReturnValue(
                createQueryMock(commercialSubscription),
            );

        const result = await getWorkspacePlanEntitlement({
            workspaceId,
        });

        expect(findOneSpy).toHaveBeenCalledOnce();
        expect(result.subscription).toBe(
            commercialSubscription,
        );
        expect(result.plan).toBe(commercialPlan);
    });

    it('retombe immédiatement sur la baseline lorsqu’un trial a dépassé trialEndsAt', async () => {
        const workspaceId = new ObjectId();

        const baselinePlan = {
            _id: new ObjectId(),
            key: PLAN_KEY.FREE,
        };

        const baselineSubscription = {
            _id: new ObjectId(),
            workspace: workspaceId,
            kind: SUBSCRIPTION_KIND.BASELINE,
            status: SUBSCRIPTION_STATUS.ACTIVE,
            plan: baselinePlan,
        };

        /*
         * MongoDB ne renverrait pas le trial expiré car la requête exige
         * trialEndsAt > now. Le statut peut donc rester momentanément trialing
         * en base sans prolonger les droits commerciaux.
         */
        const findOneSpy = vi
            .spyOn(Subscription, 'findOne')
            .mockReturnValueOnce(createQueryMock(null))
            .mockReturnValueOnce(createQueryMock(null))
            .mockReturnValueOnce(
                createQueryMock(baselineSubscription),
            );

        const result = await getWorkspacePlanEntitlement({
            workspaceId,
        });

        expect(findOneSpy).toHaveBeenCalledTimes(3);
        expect(findOneSpy).toHaveBeenNthCalledWith(
            3,
            {
                workspace: workspaceId,
                kind: SUBSCRIPTION_KIND.BASELINE,
                status: SUBSCRIPTION_STATUS.ACTIVE,
            },
        );

        expect(result).toEqual({
            subscription: baselineSubscription,
            plan: baselinePlan,
        });
    });

    it('utilise la baseline lorsqu’aucune souscription commerciale utilisable n’existe', async () => {
        const workspaceId = new ObjectId();

        const baselinePlan = {
            _id: new ObjectId(),
            key: PLAN_KEY.FREE,
        };

        const baselineSubscription = {
            _id: new ObjectId(),
            workspace: workspaceId,
            kind: SUBSCRIPTION_KIND.BASELINE,
            status: SUBSCRIPTION_STATUS.ACTIVE,
            plan: baselinePlan,
        };

        const findOneSpy = vi
            .spyOn(Subscription, 'findOne')
            .mockReturnValueOnce(createQueryMock(null))
            .mockReturnValueOnce(createQueryMock(null))
            .mockReturnValueOnce(
                createQueryMock(baselineSubscription),
            );

        const result = await getWorkspacePlanEntitlement({
            workspaceId,
        });

        expect(findOneSpy).toHaveBeenCalledTimes(3);

        expect(result).toEqual({
            subscription: baselineSubscription,
            plan: baselinePlan,
        });
    });

    it('refuse un workspace sans souscription utilisable', async () => {
        vi.spyOn(Subscription, 'findOne')
            .mockReturnValueOnce(createQueryMock(null))
            .mockReturnValueOnce(createQueryMock(null))
            .mockReturnValueOnce(createQueryMock(null));

        await expect(
            getWorkspacePlanEntitlement({
                workspaceId: new ObjectId(),
            }),
        ).rejects.toMatchObject({
            message:
                'Aucune souscription utilisable n’est associée à ce workspace.',
            statusCode: 403,
        });
    });
});
