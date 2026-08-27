import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    Subscription,
} from '../../../modules/subscriptions/subscription.model.js';

import {
    getPlatformSubscriptionById,
} from '../../../modules/platform/subscriptions/services/getPlatformSubscriptionById.service.js';


vi.mock(
    '../../../modules/subscriptions/subscription.model.js',
    () => ({
        Subscription: {
            findById: vi.fn(),
        },
    }),
);


describe('getPlatformSubscriptionById', () => {
    const subscriptionId =
        '507f1f77bcf86cd799439011';

    const workspaceId =
        '507f191e810c19729de860ea';

    const planId =
        '507f191e810c19729de860eb';

    const adminId =
        '507f191e810c19729de860ec';

    const subscription = {
        _id: {
            toString: () =>
                subscriptionId,
        },

        workspace: {
            _id: {
                toString: () =>
                    workspaceId,
            },
            name: 'Workspace Alpha',
        },

        plan: {
            _id: {
                toString: () =>
                    planId,
            },
            key: 'starter',
            name: 'Starter',
            status: 'active',
        },

        status: 'active',

        currentPeriodStart:
            new Date(
                '2026-08-01T00:00:00.000Z',
            ),

        currentPeriodEnd:
            new Date(
                '2026-09-01T00:00:00.000Z',
            ),

        trialEndsAt: null,
        cancelAtPeriodEnd: false,

        billingInterval: 'monthly',
        currency: 'EUR',
        priceExclTaxMinor: 1990,

        provider: 'manual',
        providerCustomerId: null,
        providerSubscriptionId: null,

        discountType: 'percentage',
        discountValue: 20,
        discountReason:
            'Remise commerciale',

        discountEndsAt:
            new Date(
                '2026-12-31T00:00:00.000Z',
            ),

        manualOverride: true,
        manualOverrideReason:
            'Accord commercial spécifique',

        manualOverrideBy: {
            _id: {
                toString: () =>
                    adminId,
            },
            email:
                'admin@example.com',
        },

        createdBy: {
            toString: () =>
                adminId,
        },

        updatedBy: {
            toString: () =>
                adminId,
        },

        createdAt:
            new Date(
                '2026-08-01T00:00:00.000Z',
            ),

        updatedAt:
            new Date(
                '2026-08-27T12:00:00.000Z',
            ),
    };


    beforeEach(() => {
        vi.clearAllMocks();
    });


    it('refuse un subscriptionId manquant', async () => {
        await expect(
            getPlatformSubscriptionById({
                subscriptionId: null,
            }),
        ).rejects.toBeInstanceOf(
            TypeError,
        );

        expect(
            Subscription.findById,
        ).not.toHaveBeenCalled();
    });


    it('charge la souscription avec les références administratives utiles', async () => {
        const lean = vi
            .fn()
            .mockResolvedValue(
                subscription,
            );

        const thirdPopulate = vi
            .fn()
            .mockReturnValue({
                lean,
            });

        const secondPopulate = vi
            .fn()
            .mockReturnValue({
                populate:
                    thirdPopulate,
            });

        const firstPopulate = vi
            .fn()
            .mockReturnValue({
                populate:
                    secondPopulate,
            });

        Subscription.findById
            .mockReturnValue({
                populate:
                    firstPopulate,
            });

        await getPlatformSubscriptionById({
            subscriptionId,
        });

        expect(
            Subscription.findById,
        ).toHaveBeenCalledWith(
            subscriptionId,
        );

        expect(
            firstPopulate,
        ).toHaveBeenCalledWith({
            path: 'workspace',
            select: 'name',
        });

        expect(
            secondPopulate,
        ).toHaveBeenCalledWith({
            path: 'plan',
            select: 'key name status',
        });

        expect(
            thirdPopulate,
        ).toHaveBeenCalledWith({
            path: 'manualOverrideBy',
            select: 'email',
        });
    });


    it('retourne le DTO administratif détaillé', async () => {
        const lean = vi
            .fn()
            .mockResolvedValue(
                subscription,
            );

        const thirdPopulate = vi
            .fn()
            .mockReturnValue({
                lean,
            });

        const secondPopulate = vi
            .fn()
            .mockReturnValue({
                populate:
                    thirdPopulate,
            });

        const firstPopulate = vi
            .fn()
            .mockReturnValue({
                populate:
                    secondPopulate,
            });

        Subscription.findById
            .mockReturnValue({
                populate:
                    firstPopulate,
            });

        const result =
            await getPlatformSubscriptionById({
                subscriptionId,
            });

        expect(result).toEqual({
            id: subscriptionId,

            workspace: {
                id: workspaceId,
                name:
                    'Workspace Alpha',
            },

            plan: {
                id: planId,
                key: 'starter',
                name: 'Starter',
                status: 'active',
            },

            status: 'active',

            currentPeriodStart:
                subscription.currentPeriodStart,

            currentPeriodEnd:
                subscription.currentPeriodEnd,

            trialEndsAt: null,
            cancelAtPeriodEnd: false,

            billingInterval:
                'monthly',

            currency: 'EUR',

            priceExclTaxMinor:
                1990,

            provider: 'manual',

            providerCustomerId:
                null,

            providerSubscriptionId:
                null,

            discountType:
                'percentage',

            discountValue:
                20,

            discountReason:
                'Remise commerciale',

            discountEndsAt:
                subscription.discountEndsAt,

            manualOverride:
                true,

            manualOverrideReason:
                'Accord commercial spécifique',

            manualOverrideBy: {
                id: adminId,
                email:
                    'admin@example.com',
            },

            createdBy: adminId,
            updatedBy: adminId,

            createdAt:
                subscription.createdAt,

            updatedAt:
                subscription.updatedAt,
        });
    });


    it('retourne null pour les références optionnelles absentes', async () => {
        const lean = vi
            .fn()
            .mockResolvedValue({
                ...subscription,
                workspace: null,
                plan: null,
                manualOverrideBy: null,
                createdBy: null,
                updatedBy: null,
            });

        const thirdPopulate = vi
            .fn()
            .mockReturnValue({
                lean,
            });

        const secondPopulate = vi
            .fn()
            .mockReturnValue({
                populate:
                    thirdPopulate,
            });

        const firstPopulate = vi
            .fn()
            .mockReturnValue({
                populate:
                    secondPopulate,
            });

        Subscription.findById
            .mockReturnValue({
                populate:
                    firstPopulate,
            });

        const result =
            await getPlatformSubscriptionById({
                subscriptionId,
            });

        expect(result.workspace).toBeNull();
        expect(result.plan).toBeNull();

        expect(
            result.manualOverrideBy,
        ).toBeNull();

        expect(result.createdBy).toBeNull();
        expect(result.updatedBy).toBeNull();
    });


    it('retourne 404 lorsque la souscription n’existe pas', async () => {
        const lean = vi
            .fn()
            .mockResolvedValue(null);

        const thirdPopulate = vi
            .fn()
            .mockReturnValue({
                lean,
            });

        const secondPopulate = vi
            .fn()
            .mockReturnValue({
                populate:
                    thirdPopulate,
            });

        const firstPopulate = vi
            .fn()
            .mockReturnValue({
                populate:
                    secondPopulate,
            });

        Subscription.findById
            .mockReturnValue({
                populate:
                    firstPopulate,
            });

        await expect(
            getPlatformSubscriptionById({
                subscriptionId,
            }),
        ).rejects.toMatchObject({
            statusCode: 404,
        });
    });
});