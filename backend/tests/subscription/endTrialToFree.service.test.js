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
} from '../../constants/auditActions.constants.js';

import {
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_STATUS,
} from '../../constants/subscription.constants.js';

import {
    createAuditLog,
} from '../../modules/auditLog/auditLog.service.js';

import {
    endTrialToFree,
} from '../../modules/subscriptions/services/endTrialToFree.service.js';

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
    '../../modules/subscriptions/subscription.model.js',
    () => ({
        Subscription: {
            findOne: vi.fn(),
            findOneAndUpdate: vi.fn(),
        },
    }),
);


const sessionQuery = (value) => ({
    session: vi.fn().mockResolvedValue(value),
});


describe('endTrialToFree', () => {
    const session = {
        id: 'mongo-session',
    };

    const workspaceId =
        '507f1f77bcf86cd799439011';
    const actorId =
        '507f191e810c19729de860eb';
    const baselineSubscriptionId =
        '507f191e810c19729de860ec';
    const commercialSubscriptionId =
        '507f191e810c19729de860ed';

    const trialEndsAt =
        new Date('2099-09-12T10:00:00.000Z');

    const baselineSubscription = {
        _id: baselineSubscriptionId,
        workspace: workspaceId,
        kind: SUBSCRIPTION_KIND.BASELINE,
        status: SUBSCRIPTION_STATUS.ACTIVE,
    };

    const commercialTrial = {
        _id: commercialSubscriptionId,
        workspace: workspaceId,
        kind: SUBSCRIPTION_KIND.COMMERCIAL,
        status: SUBSCRIPTION_STATUS.TRIALING,
        trialEndsAt,
    };

    const canceledSubscription = {
        ...commercialTrial,
        status: SUBSCRIPTION_STATUS.CANCELED,
        cancelAtPeriodEnd: false,
        currentPeriodEnd:
            new Date('2026-08-29T11:00:00.000Z'),
        updatedAt:
            new Date('2026-08-29T11:00:00.000Z'),
    };


    beforeEach(() => {
        vi.clearAllMocks();

        vi.spyOn(
            mongoose.connection,
            'transaction',
        ).mockImplementation(
            async (callback) => callback(session),
        );

        Subscription.findOne
            .mockReturnValueOnce(
                sessionQuery(baselineSubscription),
            )
            .mockReturnValueOnce(
                sessionQuery(commercialTrial),
            );

        Subscription.findOneAndUpdate
            .mockResolvedValue(canceledSubscription);

        createAuditLog.mockResolvedValue({
            _id: 'audit-id',
        });
    });


    it('refuse les paramètres obligatoires manquants', async () => {
        await expect(
            endTrialToFree({
                workspaceId,
                actorId: null,
            }),
        ).rejects.toBeInstanceOf(TypeError);

        expect(
            mongoose.connection.transaction,
        ).not.toHaveBeenCalled();
    });


    it('refuse le retour vers Free lorsque la baseline active est absente', async () => {
        Subscription.findOne.mockReset();
        Subscription.findOne.mockReturnValue(
            sessionQuery(null),
        );

        await expect(
            endTrialToFree({
                workspaceId,
                actorId,
            }),
        ).rejects.toMatchObject({
            statusCode: 500,
        });

        expect(
            Subscription.findOneAndUpdate,
        ).not.toHaveBeenCalled();
        expect(createAuditLog).not.toHaveBeenCalled();
    });


    it('refuse l’opération lorsqu’aucun trial commercial actif n’existe', async () => {
        Subscription.findOne.mockReset();
        Subscription.findOne
            .mockReturnValueOnce(
                sessionQuery(baselineSubscription),
            )
            .mockReturnValueOnce(
                sessionQuery(null),
            );

        await expect(
            endTrialToFree({
                workspaceId,
                actorId,
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(
            Subscription.findOneAndUpdate,
        ).not.toHaveBeenCalled();
        expect(createAuditLog).not.toHaveBeenCalled();
    });


    it('laisse l’expiration naturelle traiter un trial déjà arrivé à échéance', async () => {
        Subscription.findOne.mockReset();
        Subscription.findOne
            .mockReturnValueOnce(
                sessionQuery(baselineSubscription),
            )
            .mockReturnValueOnce(
                sessionQuery({
                    ...commercialTrial,
                    trialEndsAt:
                        new Date('2000-01-01T00:00:00.000Z'),
                }),
            );

        await expect(
            endTrialToFree({
                workspaceId,
                actorId,
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(
            Subscription.findOneAndUpdate,
        ).not.toHaveBeenCalled();
        expect(createAuditLog).not.toHaveBeenCalled();
    });


    it('annule uniquement le trial commercial et conserve la baseline comme offre effective', async () => {
        const result = await endTrialToFree({
            workspaceId,
            actorId,
            ipAddress: '127.0.0.1',
            userAgent: 'vitest',
        });

        expect(Subscription.findOne).toHaveBeenNthCalledWith(
            1,
            {
                workspace: workspaceId,
                kind: SUBSCRIPTION_KIND.BASELINE,
                status: SUBSCRIPTION_STATUS.ACTIVE,
            },
        );

        expect(Subscription.findOne).toHaveBeenNthCalledWith(
            2,
            {
                workspace: workspaceId,
                kind: SUBSCRIPTION_KIND.COMMERCIAL,
                status: SUBSCRIPTION_STATUS.TRIALING,
            },
        );

        expect(
            Subscription.findOneAndUpdate,
        ).toHaveBeenCalledOnce();

        const [filter, update, options] =
            Subscription.findOneAndUpdate.mock.calls[0];

        expect(filter).toEqual({
            _id: commercialSubscriptionId,
            workspace: workspaceId,
            kind: SUBSCRIPTION_KIND.COMMERCIAL,
            status: SUBSCRIPTION_STATUS.TRIALING,
        });

        expect(update.$set).toMatchObject({
            status: SUBSCRIPTION_STATUS.CANCELED,
            cancelAtPeriodEnd: false,
            updatedBy: actorId,
        });
        expect(update.$set.currentPeriodEnd)
            .toBeInstanceOf(Date);

        /*
         * trialEndsAt ne doit surtout pas être écrasé : cette date conserve la
         * trace de l'essai initialement accordé, même après son abandon.
         */
        expect(update.$set).not.toHaveProperty('trialEndsAt');

        expect(options).toMatchObject({
            returnDocument: 'after',
            runValidators: true,
            session,
        });

        expect(createAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                actor: actorId,
                action: AUDIT_ACTION.SUBSCRIPTION_CANCELED,
                entityType: AUDIT_ENTITY_TYPE.SUBSCRIPTION,
                entityId: commercialSubscriptionId,
                status: AUDIT_STATUS.SUCCESS,
                metadata: expect.objectContaining({
                    reason: 'trial_voluntary_return_to_free',
                    workspaceId,
                    previousStatus: SUBSCRIPTION_STATUS.TRIALING,
                    newStatus: SUBSCRIPTION_STATUS.CANCELED,
                    originalTrialEndsAt: trialEndsAt,
                    baselineSubscriptionId,
                    trialEligibilityPreserved: true,
                }),
            }),
            { session },
        );

        expect(result).toMatchObject({
            id: commercialSubscriptionId,
            kind: SUBSCRIPTION_KIND.COMMERCIAL,
            status: SUBSCRIPTION_STATUS.CANCELED,
            trialEndsAt,
            effectiveSubscription: {
                id: baselineSubscriptionId,
                kind: SUBSCRIPTION_KIND.BASELINE,
                status: SUBSCRIPTION_STATUS.ACTIVE,
            },
        });
    });


    it('refuse d’écraser une transition concurrente du trial', async () => {
        Subscription.findOneAndUpdate.mockResolvedValue(null);

        await expect(
            endTrialToFree({
                workspaceId,
                actorId,
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(createAuditLog).not.toHaveBeenCalled();
    });
});
