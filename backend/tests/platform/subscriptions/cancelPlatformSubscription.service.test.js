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
    SUBSCRIPTION_CANCELLATION_MODE,
    SUBSCRIPTION_STATUS,
} from '../../../constants/subscription.constants.js';

import {
    createAuditLog,
} from '../../../modules/auditLog/auditLog.service.js';

import {
    Subscription,
} from '../../../modules/subscriptions/subscription.model.js';

import {
    cancelPlatformSubscription,
} from '../../../modules/platform/subscriptions/services/cancelPlatformSubscription.service.js';


vi.mock(
    '../../../modules/auditLog/auditLog.service.js',
    () => ({
        createAuditLog: vi.fn(),
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


describe('cancelPlatformSubscription', () => {
    const actorId =
        '507f1f77bcf86cd799439011';

    const subscriptionId =
        '507f191e810c19729de860ea';

    const session = {
        id: 'mongo-session',
    };

    const currentPeriodEnd =
        new Date('2026-09-01T00:00:00.000Z');

    const subscription = {
        _id: subscriptionId,
        status:
            SUBSCRIPTION_STATUS.ACTIVE,
        cancelAtPeriodEnd: false,
        currentPeriodEnd,
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
                            subscription,
                        ),
            });

        createAuditLog
            .mockResolvedValue({
                _id: 'audit-id',
            });
    });


    it('refuse les paramètres obligatoires manquants', async () => {
        await expect(
            cancelPlatformSubscription({
                subscriptionId: null,
                mode:
                    SUBSCRIPTION_CANCELLATION_MODE
                        .IMMEDIATE,
                reason:
                    'Résiliation administrative',
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
                        .mockResolvedValue(null),
            });

        await expect(
            cancelPlatformSubscription({
                subscriptionId,
                mode:
                    SUBSCRIPTION_CANCELLATION_MODE
                        .IMMEDIATE,
                reason:
                    'Résiliation administrative',
                actorId,
            }),
        ).rejects.toMatchObject({
            statusCode: 404,
        });

        expect(
            Subscription.findByIdAndUpdate,
        ).not.toHaveBeenCalled();
    });


    it('annule immédiatement une souscription active', async () => {
        const updatedSubscription = {
            _id: {
                toString:
                    () => subscriptionId,
            },
            status:
                SUBSCRIPTION_STATUS.CANCELED,
            cancelAtPeriodEnd: false,
            currentPeriodEnd:
                new Date(),
            updatedAt:
                new Date(),
        };

        Subscription.findByIdAndUpdate
            .mockResolvedValue(
                updatedSubscription,
            );

        await cancelPlatformSubscription({
            subscriptionId,
            mode:
                SUBSCRIPTION_CANCELLATION_MODE
                    .IMMEDIATE,
            reason:
                'Résiliation administrative',
            actorId,
        });

        expect(
            Subscription.findByIdAndUpdate,
        ).toHaveBeenCalledWith(
            subscriptionId,
            {
                $set: expect.objectContaining({
                    status:
                        SUBSCRIPTION_STATUS
                            .CANCELED,
                    cancelAtPeriodEnd: false,
                    currentPeriodEnd:
                        expect.any(Date),
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


    it('programme une annulation en fin de période', async () => {
        const updatedSubscription = {
            _id: {
                toString:
                    () => subscriptionId,
            },
            status:
                SUBSCRIPTION_STATUS.ACTIVE,
            cancelAtPeriodEnd: true,
            currentPeriodEnd,
            updatedAt:
                new Date(),
        };

        Subscription.findByIdAndUpdate
            .mockResolvedValue(
                updatedSubscription,
            );

        await cancelPlatformSubscription({
            subscriptionId,
            mode:
                SUBSCRIPTION_CANCELLATION_MODE
                    .PERIOD_END,
            reason:
                'Résiliation à échéance',
            actorId,
        });

        expect(
            Subscription.findByIdAndUpdate,
        ).toHaveBeenCalledWith(
            subscriptionId,
            {
                $set: {
                    cancelAtPeriodEnd: true,
                    updatedBy: actorId,
                },
            },
            expect.any(Object),
        );
    });


    it('refuse une annulation différée sans fin de période', async () => {
        Subscription.findById
            .mockReturnValue({
                session:
                    vi.fn()
                        .mockResolvedValue({
                            ...subscription,
                            currentPeriodEnd: null,
                        }),
            });

        await expect(
            cancelPlatformSubscription({
                subscriptionId,
                mode:
                    SUBSCRIPTION_CANCELLATION_MODE
                        .PERIOD_END,
                reason:
                    'Résiliation à échéance',
                actorId,
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(
            Subscription.findByIdAndUpdate,
        ).not.toHaveBeenCalled();
    });


    it('refuse une annulation en fin de période déjà programmée', async () => {
        Subscription.findById
            .mockReturnValue({
                session:
                    vi.fn()
                        .mockResolvedValue({
                            ...subscription,
                            cancelAtPeriodEnd: true,
                        }),
            });

        await expect(
            cancelPlatformSubscription({
                subscriptionId,
                mode:
                    SUBSCRIPTION_CANCELLATION_MODE
                        .PERIOD_END,
                reason:
                    'Résiliation à échéance',
                actorId,
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });
    });


    it.each([
        SUBSCRIPTION_STATUS.CANCELED,
        SUBSCRIPTION_STATUS.EXPIRED,
    ])(
        'refuse l’annulation d’une souscription %s',
        async (status) => {
            Subscription.findById
                .mockReturnValue({
                    session:
                        vi.fn()
                            .mockResolvedValue({
                                ...subscription,
                                status,
                            }),
                });

            await expect(
                cancelPlatformSubscription({
                    subscriptionId,
                    mode:
                        SUBSCRIPTION_CANCELLATION_MODE
                            .IMMEDIATE,
                    reason:
                        'Résiliation administrative',
                    actorId,
                }),
            ).rejects.toMatchObject({
                statusCode: 409,
            });
        },
    );


    it('crée un AuditLog SUBSCRIPTION_CANCELED dans la transaction', async () => {
        const updatedSubscription = {
            _id: subscriptionId,
            status:
                SUBSCRIPTION_STATUS.ACTIVE,
            cancelAtPeriodEnd: true,
            currentPeriodEnd,
            updatedAt:
                new Date(),
        };

        Subscription.findByIdAndUpdate
            .mockResolvedValue(
                updatedSubscription,
            );

        await cancelPlatformSubscription({
            subscriptionId,
            mode:
                SUBSCRIPTION_CANCELLATION_MODE
                    .PERIOD_END,
            reason:
                'Résiliation à échéance',
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
                    AUDIT_ACTION
                        .SUBSCRIPTION_CANCELED,
                entityType:
                    AUDIT_ENTITY_TYPE
                        .SUBSCRIPTION,
                entityId:
                    updatedSubscription._id,
                status:
                    AUDIT_STATUS.SUCCESS,
                ipAddress: '127.0.0.1',
                userAgent: 'vitest-agent',
                metadata: {
                    mode:
                        SUBSCRIPTION_CANCELLATION_MODE
                            .PERIOD_END,
                    reason:
                        'Résiliation à échéance',
                    previousStatus:
                        SUBSCRIPTION_STATUS.ACTIVE,
                    newStatus:
                        SUBSCRIPTION_STATUS.ACTIVE,
                    cancelAtPeriodEnd: true,
                    effectiveAt:
                        currentPeriodEnd,
                },
            },
            {
                session,
            },
        );
    });
});