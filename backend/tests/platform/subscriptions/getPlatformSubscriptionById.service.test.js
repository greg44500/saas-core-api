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


const createId = (value) => ({
    toString: () => value,
});

const createQuery = (result) => {
    const lean = vi.fn().mockResolvedValue(result);
    const populates = [];

    const query = {
        select: vi.fn().mockReturnThis(),
        populate: vi.fn((config) => {
            populates.push(config);
            return query;
        }),
        lean,
    };

    return {
        query,
        populates,
        lean,
    };
};


describe('getPlatformSubscriptionById', () => {
    const subscriptionId = '507f1f77bcf86cd799439011';
    const workspaceId = '507f191e810c19729de860ea';
    const planId = '507f191e810c19729de860eb';
    const targetPlanId = '507f191e810c19729de860ed';
    const adminId = '507f191e810c19729de860ec';

    const subscription = {
        _id: createId(subscriptionId),
        workspace: {
            _id: createId(workspaceId),
            name: 'Workspace Alpha',
        },
        plan: {
            _id: createId(planId),
            key: 'premium',
            name: 'Premium',
            status: 'active',
        },
        kind: 'commercial',
        status: 'active',
        currentPeriodStart: new Date('2026-08-01T00:00:00.000Z'),
        currentPeriodEnd: new Date('2026-09-01T00:00:00.000Z'),
        trialEndsAt: null,
        cancelAtPeriodEnd: false,
        scheduledChange: {
            type: 'downgrade',
            targetPlan: {
                _id: createId(targetPlanId),
                key: 'free',
                name: 'Free',
            },
            targetBillingInterval: 'none',
            targetCurrency: 'EUR',
            targetPriceExclTaxMinor: 0,
            effectiveAt: new Date('2026-09-01T00:00:00.000Z'),
            requestedAt: new Date('2026-08-25T09:00:00.000Z'),
            requestedBy: {
                _id: createId(adminId),
                firstName: 'Admin',
                lastName: 'Platform',
                email: 'admin@example.com',
            },
        },
        billingInterval: 'monthly',
        currency: 'EUR',
        priceExclTaxMinor: 7900,
        provider: 'manual',
        providerCustomerId: null,
        providerSubscriptionId: null,
        discountType: 'percentage',
        discountValue: 20,
        discountReason: 'Remise commerciale',
        discountEndsAt: new Date('2026-12-31T00:00:00.000Z'),
        manualOverride: true,
        manualOverrideReason: 'Accord commercial spécifique',
        manualOverrideBy: {
            _id: createId(adminId),
            firstName: 'Admin',
            lastName: 'Platform',
            email: 'admin@example.com',
        },
        createdBy: createId(adminId),
        updatedBy: createId(adminId),
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: new Date('2026-08-27T12:00:00.000Z'),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('refuse un subscriptionId manquant', async () => {
        await expect(
            getPlatformSubscriptionById({ subscriptionId: null }),
        ).rejects.toBeInstanceOf(TypeError);

        expect(Subscription.findById).not.toHaveBeenCalled();
    });

    it('charge uniquement les champs et références administratives nécessaires', async () => {
        const { query, populates } = createQuery(subscription);
        Subscription.findById.mockReturnValue(query);

        await getPlatformSubscriptionById({ subscriptionId });

        expect(Subscription.findById).toHaveBeenCalledWith(subscriptionId);
        expect(query.select).toHaveBeenCalledOnce();

        const projection = query.select.mock.calls[0][0];
        expect(projection).toContain('scheduledChange');
        expect(projection).toContain('kind');
        expect(projection).not.toContain('emailCanonical');

        expect(populates).toEqual([
            { path: 'workspace', select: 'name' },
            { path: 'plan', select: 'key name status' },
            {
                path: 'manualOverrideBy',
                select: 'firstName lastName email',
            },
            {
                path: 'scheduledChange.targetPlan',
                select: 'key name',
            },
            {
                path: 'scheduledChange.requestedBy',
                select: 'firstName lastName email',
            },
        ]);
    });

    it('retourne un DTO détaillé incluant le type et le changement programmé', async () => {
        const { query } = createQuery(subscription);
        Subscription.findById.mockReturnValue(query);

        const result = await getPlatformSubscriptionById({ subscriptionId });

        expect(result).toMatchObject({
            id: subscriptionId,
            workspace: {
                id: workspaceId,
                name: 'Workspace Alpha',
            },
            plan: {
                id: planId,
                key: 'premium',
                name: 'Premium',
                status: 'active',
            },
            kind: 'commercial',
            status: 'active',
            scheduledChange: {
                type: 'downgrade',
                targetPlan: {
                    id: targetPlanId,
                    key: 'free',
                    name: 'Free',
                },
                targetBillingInterval: 'none',
                targetCurrency: 'EUR',
                targetPriceExclTaxMinor: 0,
                effectiveAt: subscription.scheduledChange.effectiveAt,
                requestedAt: subscription.scheduledChange.requestedAt,
                requestedBy: {
                    id: adminId,
                    firstName: 'Admin',
                    lastName: 'Platform',
                    email: 'admin@example.com',
                },
            },
            manualOverrideBy: {
                id: adminId,
                firstName: 'Admin',
                lastName: 'Platform',
                email: 'admin@example.com',
            },
            createdBy: adminId,
            updatedBy: adminId,
        });
    });

    it('retourne null pour les références optionnelles absentes', async () => {
        const { query } = createQuery({
            ...subscription,
            workspace: null,
            plan: null,
            scheduledChange: null,
            manualOverrideBy: null,
            createdBy: null,
            updatedBy: null,
        });
        Subscription.findById.mockReturnValue(query);

        const result = await getPlatformSubscriptionById({ subscriptionId });

        expect(result.workspace).toBeNull();
        expect(result.plan).toBeNull();
        expect(result.scheduledChange).toBeNull();
        expect(result.manualOverrideBy).toBeNull();
        expect(result.createdBy).toBeNull();
        expect(result.updatedBy).toBeNull();
    });

    it('conserve le changement programmé même si ses références ne sont plus résolubles', async () => {
        const { query } = createQuery({
            ...subscription,
            scheduledChange: {
                ...subscription.scheduledChange,
                targetPlan: null,
                requestedBy: null,
            },
        });
        Subscription.findById.mockReturnValue(query);

        const result = await getPlatformSubscriptionById({ subscriptionId });

        expect(result.scheduledChange).toMatchObject({
            type: 'downgrade',
            targetPlan: null,
            requestedBy: null,
        });
    });

    it('retourne 404 lorsque la souscription n’existe pas', async () => {
        const { query } = createQuery(null);
        Subscription.findById.mockReturnValue(query);

        await expect(
            getPlatformSubscriptionById({ subscriptionId }),
        ).rejects.toMatchObject({ statusCode: 404 });
    });
});