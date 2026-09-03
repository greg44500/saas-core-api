import mongoose from 'mongoose';
import {
    afterEach,
    beforeEach,
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
    WORKSPACE_ACCESS_MODE,
    WORKSPACE_ACCESS_REASON,
} from '../../constants/workspaceAccess.constants.js';

vi.mock(
    '../../modules/plan/planCompatibility.service.js',
    () => ({
        assessWorkspaceLimitsCompatibility: vi.fn(),
    }),
);

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

import {
    composeEffectiveEntitlementCapabilities,
} from '../../modules/entitlementOverride/effectiveEntitlement.service.js';
import {
    resolveActiveEntitlementOverrides,
} from '../../modules/entitlementOverride/entitlementOverride.service.js';
import {
    assessWorkspaceLimitsCompatibility,
} from '../../modules/plan/planCompatibility.service.js';
import { Subscription } from '../../modules/subscriptions/subscription.model.js';
import {
    getWorkspaceAccessEntitlement,
} from '../../modules/subscriptions/subscription.service.js';


const { ObjectId } = mongoose.Types;

const createQueryMock = (result) => ({
    populate: vi.fn().mockResolvedValue(result),
});

const createCommercialSubscription = ({ workspaceId, plan }) => ({
    _id: new ObjectId(),
    workspace: workspaceId,
    kind: SUBSCRIPTION_KIND.COMMERCIAL,
    status: SUBSCRIPTION_STATUS.ACTIVE,
    currentPeriodEnd: new Date('2026-09-29T12:00:00.000Z'),
    plan,
});


describe('getWorkspaceAccessEntitlement', () => {
    beforeEach(() => {
        resolveActiveEntitlementOverrides.mockResolvedValue({
            at: new Date('2026-08-29T12:00:00.000Z'),
            features: {},
            limits: {},
            overrides: [],
        });

        composeEffectiveEntitlementCapabilities.mockReturnValue({
            features: ['file_upload'],
            limits: {
                members: 5,
                storage_bytes: 20_000,
                file_uploads_monthly: 10,
            },
            appliedOverrides: [],
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });

    it('retourne normal lorsque les limites effectives sont respectées', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-08-29T12:00:00.000Z'));

        const workspaceId = new ObjectId();
        const plan = {
            _id: new ObjectId(),
            key: 'premium',
        };
        const subscription = createCommercialSubscription({
            workspaceId,
            plan,
        });

        vi.spyOn(Subscription, 'findOne')
            .mockReturnValue(createQueryMock(subscription));
        assessWorkspaceLimitsCompatibility.mockResolvedValue({
            compatible: true,
            blockingLimits: [],
            nonBlockingLimits: [],
        });

        const at = new Date('2026-08-29T12:00:00.000Z');
        const result = await getWorkspaceAccessEntitlement({
            workspaceId,
            at,
        });

        expect(result.accessMode).toBe(WORKSPACE_ACCESS_MODE.NORMAL);
        expect(result.reason).toBeNull();
        expect(result.blockingLimits).toEqual([]);
        expect(result.effectiveCapabilities.limits.members).toBe(5);

        expect(assessWorkspaceLimitsCompatibility)
            .toHaveBeenCalledWith(expect.objectContaining({
                workspaceId,
                at,
                limits: {
                    members: 5,
                    storage_bytes: 20_000,
                    file_uploads_monthly: 10,
                },
            }));
    });

    it('retourne remediation lorsqu’une limite effective bloquante est dépassée', async () => {
        const workspaceId = new ObjectId();
        const plan = {
            _id: new ObjectId(),
            key: 'starter',
        };
        const subscription = createCommercialSubscription({
            workspaceId,
            plan,
        });
        const blockingLimits = [
            {
                key: 'members',
                usage: 8,
                limit: 5,
                excess: 3,
            },
        ];

        vi.spyOn(Subscription, 'findOne')
            .mockReturnValue(createQueryMock(subscription));
        assessWorkspaceLimitsCompatibility.mockResolvedValue({
            compatible: false,
            blockingLimits,
            nonBlockingLimits: [],
        });

        const result = await getWorkspaceAccessEntitlement({
            workspaceId,
        });

        expect(result.accessMode)
            .toBe(WORKSPACE_ACCESS_MODE.REMEDIATION);
        expect(result.reason)
            .toBe(WORKSPACE_ACCESS_REASON.PLAN_LIMITS_EXCEEDED);
        expect(result.blockingLimits).toEqual(blockingLimits);
    });

    it('évalue la remédiation avec une limite modifiée par override', async () => {
        const workspaceId = new ObjectId();
        const plan = {
            _id: new ObjectId(),
            key: 'premium',
            limits: new Map([
                ['members', 10],
            ]),
        };
        const subscription = createCommercialSubscription({
            workspaceId,
            plan,
        });

        vi.spyOn(Subscription, 'findOne')
            .mockReturnValue(createQueryMock(subscription));

        composeEffectiveEntitlementCapabilities.mockReturnValue({
            features: [],
            limits: {
                members: 3,
            },
            appliedOverrides: [
                {
                    id: 'override-id',
                    metricKey: 'members',
                    limitValue: 3,
                },
            ],
        });

        assessWorkspaceLimitsCompatibility.mockResolvedValue({
            compatible: false,
            blockingLimits: [
                {
                    key: 'members',
                    usage: 4,
                    limit: 3,
                    excess: 1,
                },
            ],
            nonBlockingLimits: [],
        });

        const result = await getWorkspaceAccessEntitlement({
            workspaceId,
        });

        expect(assessWorkspaceLimitsCompatibility)
            .toHaveBeenCalledWith(expect.objectContaining({
                limits: {
                    members: 3,
                },
            }));
        expect(result.accessMode)
            .toBe(WORKSPACE_ACCESS_MODE.REMEDIATION);
    });

    it('ne passe pas en remédiation pour un compteur de consommation seulement', async () => {
        const workspaceId = new ObjectId();
        const plan = {
            _id: new ObjectId(),
            key: 'starter',
        };
        const subscription = createCommercialSubscription({
            workspaceId,
            plan,
        });

        vi.spyOn(Subscription, 'findOne')
            .mockReturnValue(createQueryMock(subscription));
        assessWorkspaceLimitsCompatibility.mockResolvedValue({
            compatible: true,
            blockingLimits: [],
            nonBlockingLimits: [
                {
                    key: 'file_uploads_monthly',
                    usage: 40,
                    limit: 10,
                    excess: 30,
                },
            ],
        });

        const result = await getWorkspaceAccessEntitlement({
            workspaceId,
        });

        expect(result.accessMode).toBe(WORKSPACE_ACCESS_MODE.NORMAL);
        expect(result.nonBlockingLimits).toHaveLength(1);
    });

    it('restaure automatiquement normal lorsque la mesure suivante est redevenue conforme', async () => {
        const workspaceId = new ObjectId();
        const plan = {
            _id: new ObjectId(),
            key: 'starter',
        };
        const subscription = createCommercialSubscription({
            workspaceId,
            plan,
        });

        vi.spyOn(Subscription, 'findOne')
            .mockReturnValue(createQueryMock(subscription));
        assessWorkspaceLimitsCompatibility
            .mockResolvedValueOnce({
                compatible: false,
                blockingLimits: [
                    {
                        key: 'members',
                        usage: 8,
                        limit: 5,
                    },
                ],
                nonBlockingLimits: [],
            })
            .mockResolvedValueOnce({
                compatible: true,
                blockingLimits: [],
                nonBlockingLimits: [],
            });

        const restricted = await getWorkspaceAccessEntitlement({
            workspaceId,
        });
        const restored = await getWorkspaceAccessEntitlement({
            workspaceId,
        });

        expect(restricted.accessMode)
            .toBe(WORKSPACE_ACCESS_MODE.REMEDIATION);
        expect(restored.accessMode)
            .toBe(WORKSPACE_ACCESS_MODE.NORMAL);
        expect(restored.reason).toBeNull();
    });

    it('valide les paramètres avant toute lecture', async () => {
        const findOneSpy = vi.spyOn(Subscription, 'findOne');

        await expect(
            getWorkspaceAccessEntitlement({}),
        ).rejects.toThrow(TypeError);

        await expect(
            getWorkspaceAccessEntitlement({
                workspaceId: new ObjectId(),
                at: new Date('invalid'),
            }),
        ).rejects.toThrow(TypeError);

        expect(findOneSpy).not.toHaveBeenCalled();
    });
});