import mongoose from 'mongoose';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_STATUS,
} from '../../constants/subscription.constants.js';
import {
    composeEffectiveEntitlementCapabilities,
} from '../../modules/entitlementOverride/effectiveEntitlement.service.js';
import {
    resolveActiveEntitlementOverrides,
} from '../../modules/entitlementOverride/entitlementOverride.service.js';
import {
    createPlanCapabilityRegistry,
} from '../../modules/plan/planCapability.registry.js';
import { Subscription } from '../../modules/subscriptions/subscription.model.js';
import {
    getWorkspaceEffectiveEntitlement,
} from '../../modules/subscriptions/subscription.service.js';


vi.mock(
    '../../modules/entitlementOverride/entitlementOverride.service.js',
    () => ({
        resolveActiveEntitlementOverrides: vi.fn(),
    }),
);

vi.mock(
    '../../modules/entitlementOverride/effectiveEntitlement.service.js',
    () => ({
        composeEffectiveEntitlementCapabilities: vi.fn(),
    }),
);

const { ObjectId } = mongoose.Types;

const createSubscriptionQuery = ({
    result,
    session,
}) => {
    const query = {
        populate: vi.fn(() => query),
        session: vi.fn(() => query),
        then: (resolve, reject) =>
            Promise.resolve(result).then(resolve, reject),
    };

    if (session) {
        query.expectedSession = session;
    }

    return query;
};


afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
});


describe('getWorkspaceEffectiveEntitlement', () => {
    it('résout Plan et overrides au même instant avec le même registre applicatif', async () => {
        const workspaceId = new ObjectId();
        const plan = {
            _id: new ObjectId(),
            key: 'premium',
            features: ['file_upload'],
            limits: new Map([
                ['members', 5],
            ]),
        };
        const subscription = {
            _id: new ObjectId(),
            workspace: workspaceId,
            kind: SUBSCRIPTION_KIND.COMMERCIAL,
            status: SUBSCRIPTION_STATUS.ACTIVE,
            currentPeriodEnd: new Date('2026-10-01T00:00:00.000Z'),
            plan,
        };
        const at = new Date('2026-09-03T12:00:00.000Z');
        const session = { id: 'mongo-session' };
        const registry = createPlanCapabilityRegistry({
            features: ['price_history'],
        });
        const activeOverrides = {
            at,
            features: {
                price_history: true,
            },
            limits: {},
            overrides: [],
        };
        const effectiveCapabilities = {
            features: ['file_upload', 'price_history'],
            limits: {
                members: 5,
            },
            appliedOverrides: [],
        };

        const query = createSubscriptionQuery({
            result: subscription,
            session,
        });
        const findOneSpy = vi
            .spyOn(Subscription, 'findOne')
            .mockReturnValue(query);

        resolveActiveEntitlementOverrides
            .mockResolvedValue(activeOverrides);
        composeEffectiveEntitlementCapabilities
            .mockReturnValue(effectiveCapabilities);

        const result = await getWorkspaceEffectiveEntitlement({
            workspaceId,
            at,
            registry,
            session,
        });

        expect(findOneSpy).toHaveBeenCalledWith({
            workspace: workspaceId,
            kind: SUBSCRIPTION_KIND.COMMERCIAL,
            status: SUBSCRIPTION_STATUS.ACTIVE,
            currentPeriodEnd: mongoose.trusted({
                $type: 'date',
                $gt: at,
            }),
        });
        expect(query.session).toHaveBeenCalledWith(session);

        expect(resolveActiveEntitlementOverrides)
            .toHaveBeenCalledWith({
                workspaceId,
                at,
                registry,
                session,
            });

        expect(composeEffectiveEntitlementCapabilities)
            .toHaveBeenCalledWith({
                plan,
                activeOverrides,
                registry,
            });

        expect(result).toEqual({
            subscription,
            plan,
            at,
            effectiveCapabilities,
        });
    });

    it('refuse les paramètres temporels invalides avant toute lecture', async () => {
        const findOneSpy = vi.spyOn(Subscription, 'findOne');

        await expect(
            getWorkspaceEffectiveEntitlement({
                workspaceId: new ObjectId(),
                at: new Date('invalid'),
            }),
        ).rejects.toThrow('at must be a valid Date');

        expect(findOneSpy).not.toHaveBeenCalled();
        expect(resolveActiveEntitlementOverrides).not.toHaveBeenCalled();
        expect(composeEffectiveEntitlementCapabilities).not.toHaveBeenCalled();
    });
});
