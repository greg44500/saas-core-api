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


describe('listPlatformSubscriptions', () => {
    const subscriptions = [
        {
            _id: 'subscription-1',
            workspace: {
                _id: 'workspace-1',
                name: 'Workspace Alpha',
            },
            plan: {
                _id: 'plan-1',
                key: 'starter',
                name: 'Starter',
            },
            status: 'active',
        },
    ];


    beforeEach(() => {
        vi.clearAllMocks();
    });


    it('retourne les souscriptions paginées', async () => {
        const lean = vi
            .fn()
            .mockResolvedValue(
                subscriptions,
            );

        const limit = vi
            .fn()
            .mockReturnValue({
                lean,
            });

        const skip = vi
            .fn()
            .mockReturnValue({
                limit,
            });

        const sort = vi
            .fn()
            .mockReturnValue({
                skip,
            });

        const secondPopulate = vi
            .fn()
            .mockReturnValue({
                sort,
            });

        const firstPopulate = vi
            .fn()
            .mockReturnValue({
                populate:
                    secondPopulate,
            });

        Subscription.find
            .mockReturnValue({
                populate:
                    firstPopulate,
            });

        Subscription.countDocuments
            .mockResolvedValue(21);

        const result =
            await listPlatformSubscriptions({
                page: 2,
                limit: 10,
            });

        expect(
            Subscription.find,
        ).toHaveBeenCalledWith({});

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
            select: 'key name',
        });

        expect(
            sort,
        ).toHaveBeenCalledWith({
            createdAt: -1,
        });

        expect(
            skip,
        ).toHaveBeenCalledWith(10);

        expect(
            limit,
        ).toHaveBeenCalledWith(10);

        expect(
            Subscription.countDocuments,
        ).toHaveBeenCalledWith({});

        expect(result).toEqual({
            subscriptions,
            pagination: {
                page: 2,
                limit: 10,
                total: 21,
                totalPages: 3,
            },
        });
    });


    it('retourne zéro page lorsque la collection est vide', async () => {
        const lean = vi
            .fn()
            .mockResolvedValue([]);

        const limit = vi
            .fn()
            .mockReturnValue({
                lean,
            });

        const skip = vi
            .fn()
            .mockReturnValue({
                limit,
            });

        const sort = vi
            .fn()
            .mockReturnValue({
                skip,
            });

        const secondPopulate = vi
            .fn()
            .mockReturnValue({
                sort,
            });

        const firstPopulate = vi
            .fn()
            .mockReturnValue({
                populate:
                    secondPopulate,
            });

        Subscription.find
            .mockReturnValue({
                populate:
                    firstPopulate,
            });

        Subscription.countDocuments
            .mockResolvedValue(0);

        const result =
            await listPlatformSubscriptions({
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