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
    SUBSCRIPTION_STATUS,
} from '../../../constants/subscription.constants.js';

import {
    createAuditLog,
} from '../../../modules/auditLog/auditLog.service.js';

import {
    Subscription,
} from '../../../modules/subscriptions/subscription.model.js';

import {
    resumePlatformSubscription,
} from '../../../modules/platform/subscriptions/services/resumePlatformSubscription.service.js';


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


describe('resumePlatformSubscription', () => {
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
        cancelAtPeriodEnd: true,
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
            resumePlatformSubscription({
                subscriptionId: null,
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
            resumePlatformSubscription({
                subscriptionId,
                actorId,
            }),
        ).rejects.toMatchObject({
            statusCode: 404,
        });

        expect(
            Subscription.findByIdAndUpdate,
        ).not.toHaveBeenCalled();
    });


    it('retire une annulation programmée', async () => {
        const resumedSubscription = {
            _id: {
                toString:
                    () => subscriptionId,
            },
            status:
                SUBSCRIPTION_STATUS.ACTIVE,
            cancelAtPeriodEnd: false,
            currentPeriodEnd,
            updatedAt:
                new Date(),
        };

        Subscription.findByIdAndUpdate
            .mockResolvedValue(
                resumedSubscription,
            );

        await resumePlatformSubscription({
            subscriptionId,
            actorId,
        });

        expect(
            Subscription.findByIdAndUpdate,
        ).toHaveBeenCalledWith(
            subscriptionId,
            {
                $set: {
                    cancelAtPeriodEnd: false,
                    updatedBy: actorId,
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );
    });


    it('refuse lorsqu’aucune annulation n’est programmée', async () => {
        Subscription.findById
            .mockReturnValue({
                session:
                    vi.fn()
                        .mockResolvedValue({
                            ...subscription,
                            cancelAtPeriodEnd: false,
                        }),
            });

        await expect(
            resumePlatformSubscription({
                subscriptionId,
                actorId,
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(
            Subscription.findByIdAndUpdate,
        ).not.toHaveBeenCalled();
    });


    it.each([
        SUBSCRIPTION_STATUS.CANCELED,
        SUBSCRIPTION_STATUS.EXPIRED,
    ])(
        'refuse la reprise d’une souscription %s',
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
                resumePlatformSubscription({
                    subscriptionId,
                    actorId,
                }),
            ).rejects.toMatchObject({
                statusCode: 409,
            });

            expect(
                Subscription.findByIdAndUpdate,
            ).not.toHaveBeenCalled();
        },
    );


    it('crée un AuditLog SUBSCRIPTION_RESUMED dans la transaction', async () => {
        const resumedSubscription = {
            _id: subscriptionId,
            status:
                SUBSCRIPTION_STATUS.ACTIVE,
            cancelAtPeriodEnd: false,
            currentPeriodEnd,
            updatedAt:
                new Date(),
        };

        Subscription.findByIdAndUpdate
            .mockResolvedValue(
                resumedSubscription,
            );

        await resumePlatformSubscription({
            subscriptionId,
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
                    AUDIT_ACTION.SUBSCRIPTION_RESUMED,
                entityType:
                    AUDIT_ENTITY_TYPE.SUBSCRIPTION,
                entityId:
                    resumedSubscription._id,
                status:
                    AUDIT_STATUS.SUCCESS,
                ipAddress: '127.0.0.1',
                userAgent: 'vitest-agent',
                metadata: {
                    status:
                        SUBSCRIPTION_STATUS.ACTIVE,
                    previousCancelAtPeriodEnd:
                        true,
                    cancelAtPeriodEnd:
                        false,
                },
            },
            {
                session,
            },
        );
    });
});