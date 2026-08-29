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
    WORKSPACE_ACCESS_MODE,
    WORKSPACE_ACCESS_REASON,
} from '../../constants/workspaceAccess.constants.js';
import {
    assessWorkspacePlanCompatibility,
} from '../../modules/plan/planCompatibility.service.js';
import { Subscription } from '../../modules/subscriptions/subscription.model.js';
import {
    getWorkspaceAccessEntitlement,
} from '../../modules/subscriptions/subscription.service.js';

vi.mock(
    '../../modules/plan/planCompatibility.service.js',
    () => ({
        assessWorkspacePlanCompatibility: vi.fn(),
    }),
);

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
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });

    it('retourne normal lorsqu’aucune capacité bloquante ne dépasse le plan effectif', async () => {
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
        assessWorkspacePlanCompatibility.mockResolvedValue({
            compatible: true,
            blockingLimits: [],
            nonBlockingLimits: [],
        });

        const result = await getWorkspaceAccessEntitlement({
            workspaceId,
            at: new Date('2026-08-29T12:00:00.000Z'),
        });

        expect(result.accessMode).toBe(WORKSPACE_ACCESS_MODE.NORMAL);
        expect(result.reason).toBeNull();
        expect(result.blockingLimits).toEqual([]);
        expect(assessWorkspacePlanCompatibility)
            .toHaveBeenCalledWith(expect.objectContaining({
                workspaceId,
                targetPlanId: plan._id,
            }));
    });

    it('retourne remediation avec les dépassements réductibles', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-08-29T12:00:00.000Z'));

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
        assessWorkspacePlanCompatibility.mockResolvedValue({
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
        assessWorkspacePlanCompatibility.mockResolvedValue({
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
        assessWorkspacePlanCompatibility
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
