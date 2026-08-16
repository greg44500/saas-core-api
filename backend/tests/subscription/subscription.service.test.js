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

        /*
         * Le service doit refuser immédiatement l'opération avant toute
         * lecture ou écriture MongoDB.
         */
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