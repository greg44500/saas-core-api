import mongoose from 'mongoose';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    EntitlementOverride,
} from '../../../modules/entitlementOverride/entitlementOverride.model.js';
import {
    assertCreateFeatureOverrideGroupOperational,
    assertLimitValueWithinPolicy,
    assertUpdateLimitOverrideWithinPolicy,
} from '../../../modules/platform/entitlementOverrides/platformEntitlementOverrideGuardrails.service.js';
import {
    getWorkspaceEffectiveEntitlement,
} from '../../../modules/subscriptions/subscription.service.js';
import {
    getUsageMetricValue,
} from '../../../modules/usageMetric/usageMetric.service.js';


vi.mock(
    '../../../modules/subscriptions/subscription.service.js',
    () => ({
        getWorkspaceEffectiveEntitlement: vi.fn(),
    }),
);

vi.mock(
    '../../../modules/usageMetric/usageMetric.service.js',
    () => ({
        getUsageMetricValue: vi.fn(),
    }),
);

const createId = () => new mongoose.Types.ObjectId();
const NOW = new Date('2026-09-11T10:00:00.000Z');

const buildSelectLeanQuery = (result) => {
    const query = {
        select: vi.fn(() => query),
        lean: vi.fn().mockResolvedValue(result),
    };

    return query;
};

const mockEffectiveLimits = (limits, usage = {}) => {
    getWorkspaceEffectiveEntitlement.mockResolvedValue({
        effectiveCapabilities: {
            features: [],
            limits,
            appliedOverrides: [],
        },
    });
    getUsageMetricValue.mockImplementation(({ metricKey }) =>
        Promise.resolve(usage[metricKey] ?? 0));
};

const captureError = (callback) => {
    try {
        callback();
    } catch (error) {
        return error;
    }

    return null;
};


describe('platformEntitlementOverrideGuardrails.service', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });

    it('refuse d’activer la gestion d’équipe lorsque members reste à 1', async () => {
        const workspaceId = createId();
        mockEffectiveLimits({ members: 1 }, { members: 1 });

        await expect(assertCreateFeatureOverrideGroupOperational({
            groupData: {
                workspaceId: workspaceId.toString(),
                featureKey: 'team_management',
                relatedLimits: [],
            },
            now: NOW,
        })).rejects.toMatchObject({
            statusCode: 409,
        });
    });

    it('accepte la gestion d’équipe avec une dérogation members à 2', async () => {
        const workspaceId = createId();
        mockEffectiveLimits({ members: 1 }, { members: 1 });

        await expect(assertCreateFeatureOverrideGroupOperational({
            groupData: {
                workspaceId: workspaceId.toString(),
                featureKey: 'team_management',
                relatedLimits: [
                    { metricKey: 'members', limitValue: 2 },
                ],
            },
            now: NOW,
        })).resolves.toBeUndefined();
    });

    it('n’impose pas une nouvelle limite si une place reste réellement disponible', async () => {
        const workspaceId = createId();
        mockEffectiveLimits({ members: 5 }, { members: 4 });

        await expect(assertCreateFeatureOverrideGroupOperational({
            groupData: {
                workspaceId: workspaceId.toString(),
                featureKey: 'team_management',
                relatedLimits: [],
            },
            now: NOW,
        })).resolves.toBeUndefined();
    });

    it('refuse un quota members supérieur mais déjà entièrement consommé', async () => {
        const workspaceId = createId();
        mockEffectiveLimits({ members: 5 }, { members: 5 });

        await expect(assertCreateFeatureOverrideGroupOperational({
            groupData: {
                workspaceId: workspaceId.toString(),
                featureKey: 'team_management',
                relatedLimits: [],
            },
            now: NOW,
        })).rejects.toMatchObject({
            statusCode: 409,
        });
    });

    it('refuse une limite members au-delà du maximum administratif', () => {
        const aboveMaximum = captureError(() =>
            assertLimitValueWithinPolicy({
                metricKey: 'members',
                limitValue: 51,
            }));
        const unlimited = captureError(() =>
            assertLimitValueWithinPolicy({
                metricKey: 'members',
                limitValue: null,
            }));

        expect(aboveMaximum).toMatchObject({ statusCode: 400 });
        expect(unlimited).toMatchObject({ statusCode: 400 });
    });

    it('refuse la modification directe d’une limite au-delà de sa politique', async () => {
        const overrideId = createId();

        vi.spyOn(EntitlementOverride, 'findById')
            .mockReturnValue(buildSelectLeanQuery({
                _id: overrideId,
                targetType: 'limit',
                metricKey: 'members',
            }));

        await expect(assertUpdateLimitOverrideWithinPolicy({
            overrideId,
            overrideData: {
                limitValue: 100,
            },
        })).rejects.toMatchObject({
            statusCode: 400,
        });
    });
});
