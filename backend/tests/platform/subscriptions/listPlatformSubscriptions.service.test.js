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
    listPlatformSubscriptions,
} from '../../../modules/platform/subscriptions/services/listPlatformSubscriptions.service.js';


vi.mock(
    '../../../modules/subscriptions/subscription.model.js',
    () => ({
        Subscription: {
            find: vi.fn(),
            countDocuments: vi.fn(),
        },
    }),
);


const createId = (value) => ({
    toString: () => value,
});


const createQuery = (documents) => {
    const lean = vi.fn().mockResolvedValue(documents);
    const limit = vi.fn().mockReturnValue({ lean });
    const skip = vi.fn().mockReturnValue({ limit });
    const sort = vi.fn().mockReturnValue({ skip });
    const secondPopulate = vi.fn().mockReturnValue({ sort });
    const firstPopulate = vi.fn().mockReturnValue({
        populate: secondPopulate,
    });
    const select = vi.fn().mockReturnValue({
        populate: firstPopulate,
    });

    return {
        query: { select },
        select,
        firstPopulate,
        secondPopulate,
        sort,
        skip,
        limit,
    };
};


describe('listPlatformSubscriptions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('retourne un DTO administratif paginé et explicitement projeté', async () => {
        const currentPeriodStart = new Date('2026-09-01T00:00:00.000Z');
        const currentPeriodEnd = new Date('2026-10-01T00:00:00.000Z');
        const createdAt = new Date('2026-08-20T10:00:00.000Z');
        const updatedAt = new Date('2026-09-01T08:00:00.000Z');
        const subscriptionDocuments = [
            {
                _id: createId('subscription-1'),
                workspace: {
                    _id: createId('workspace-1'),
                    name: 'Workspace Alpha',
                },
                plan: {
                    _id: createId('plan-1'),
                    key: 'premium',
                    name: 'Premium',
                },
                kind: 'commercial',
                status: 'active',
                currentPeriodStart,
                currentPeriodEnd,
                trialEndsAt: null,
                cancelAtPeriodEnd: false,
                billingInterval: 'monthly',
                currency: 'EUR',
                priceExclTaxMinor: 7900,
                manualOverride: false,
                createdAt,
                updatedAt,
                providerCustomerId: 'must-not-leak',
            },
        ];

        const query = createQuery(subscriptionDocuments);
        Subscription.find.mockReturnValue(query.query);
        Subscription.countDocuments.mockResolvedValue(21);

        const result = await listPlatformSubscriptions({
            page: 2,
            limit: 10,
        });

        expect(Subscription.find).toHaveBeenCalledWith({});
        expect(query.select).toHaveBeenCalledWith(
            '_id workspace plan kind status '
            + 'currentPeriodStart currentPeriodEnd trialEndsAt '
            + 'cancelAtPeriodEnd billingInterval currency '
            + 'priceExclTaxMinor manualOverride createdAt updatedAt',
        );
        expect(query.firstPopulate).toHaveBeenCalledWith({
            path: 'workspace',
            select: '_id name',
        });
        expect(query.secondPopulate).toHaveBeenCalledWith({
            path: 'plan',
            select: '_id key name',
        });
        expect(query.sort).toHaveBeenCalledWith({
            createdAt: -1,
            _id: -1,
        });
        expect(query.skip).toHaveBeenCalledWith(10);
        expect(query.limit).toHaveBeenCalledWith(10);
        expect(Subscription.countDocuments).toHaveBeenCalledWith({});

        expect(result).toEqual({
            subscriptions: [
                {
                    id: 'subscription-1',
                    workspace: {
                        id: 'workspace-1',
                        name: 'Workspace Alpha',
                    },
                    plan: {
                        id: 'plan-1',
                        key: 'premium',
                        name: 'Premium',
                    },
                    kind: 'commercial',
                    status: 'active',
                    currentPeriodStart,
                    currentPeriodEnd,
                    trialEndsAt: null,
                    cancelAtPeriodEnd: false,
                    billingInterval: 'monthly',
                    currency: 'EUR',
                    priceExclTaxMinor: 7900,
                    manualOverride: false,
                    createdAt,
                    updatedAt,
                },
            ],
            pagination: {
                page: 2,
                limit: 10,
                total: 21,
                totalPages: 3,
            },
        });
        expect(result.subscriptions[0]).not.toHaveProperty(
            'providerCustomerId',
        );
    });

    it('gère les références Workspace ou Plan devenues indisponibles', async () => {
        const query = createQuery([
            {
                _id: createId('subscription-1'),
                workspace: null,
                plan: null,
                kind: 'commercial',
                status: 'active',
                currentPeriodStart: new Date(),
                currentPeriodEnd: null,
                trialEndsAt: null,
                cancelAtPeriodEnd: false,
                billingInterval: 'none',
                currency: 'EUR',
                priceExclTaxMinor: 0,
                manualOverride: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ]);
        Subscription.find.mockReturnValue(query.query);
        Subscription.countDocuments.mockResolvedValue(1);

        const result = await listPlatformSubscriptions({
            page: 1,
            limit: 20,
        });

        expect(result.subscriptions[0].workspace).toBeNull();
        expect(result.subscriptions[0].plan).toBeNull();
    });

    it('retourne zéro page lorsque la collection est vide', async () => {
        const query = createQuery([]);
        Subscription.find.mockReturnValue(query.query);
        Subscription.countDocuments.mockResolvedValue(0);

        const result = await listPlatformSubscriptions({
            page: 1,
            limit: 20,
        });

        expect(result).toEqual({
            subscriptions: [],
            pagination: {
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0,
            },
        });
    });
});
