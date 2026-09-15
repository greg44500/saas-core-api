import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    CORE_PLAN_METRIC,
} from '../../modules/plan/planCapability.registry.js';

const mocks = vi.hoisted(() => ({
    getWorkspaceEffectiveEntitlement: vi.fn(),
    getUsageMetricValue: vi.fn(),
    resolveEffectiveMetricLimit: vi.fn(),
}));

vi.mock('../../modules/subscriptions/subscription.service.js', () => ({
    getWorkspaceEffectiveEntitlement:
        mocks.getWorkspaceEffectiveEntitlement,
}));

vi.mock('../../modules/usageMetric/usageMetric.service.js', () => ({
    getUsageMetricValue: mocks.getUsageMetricValue,
}));

vi.mock('../../modules/plan/planLimit.service.js', () => ({
    resolveEffectiveMetricLimit:
        mocks.resolveEffectiveMetricLimit,
}));

import {
    getWorkspaceFileStorageUsage,
} from '../../modules/file/fileStorage.service.js';


describe('getWorkspaceFileStorageUsage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('combine UsageMetric avec la limite effective du workspace', async () => {
        const at = new Date('2026-09-15T12:00:00.000Z');
        const entitlement = {
            subscription: { id: 'subscription-1' },
            plan: { id: 'plan-1' },
            effectiveCapabilities: {
                limits: {
                    [CORE_PLAN_METRIC.STORAGE_BYTES]: 1000,
                },
            },
        };

        mocks.getWorkspaceEffectiveEntitlement
            .mockResolvedValue(entitlement);
        mocks.getUsageMetricValue.mockResolvedValue(640);
        mocks.resolveEffectiveMetricLimit.mockReturnValue(1000);

        await expect(
            getWorkspaceFileStorageUsage({
                workspaceId: 'workspace-1',
                at,
            }),
        ).resolves.toEqual({
            usedBytes: 640,
            limitBytes: 1000,
            remainingBytes: 360,
            unlimited: false,
            overLimit: false,
        });

        expect(
            mocks.getWorkspaceEffectiveEntitlement,
        ).toHaveBeenCalledWith({
            workspaceId: 'workspace-1',
            at,
        });
        expect(mocks.getUsageMetricValue).toHaveBeenCalledWith({
            workspaceId: 'workspace-1',
            metricKey: CORE_PLAN_METRIC.STORAGE_BYTES,
            at,
        });
        expect(
            mocks.resolveEffectiveMetricLimit,
        ).toHaveBeenCalledWith({
            entitlement,
            metricKey: CORE_PLAN_METRIC.STORAGE_BYTES,
        });
    });

    it('préserve explicitement une limite illimitée', async () => {
        mocks.getWorkspaceEffectiveEntitlement
            .mockResolvedValue({
                subscription: {},
                plan: {},
                effectiveCapabilities: { limits: {} },
            });
        mocks.getUsageMetricValue.mockResolvedValue(2048);
        mocks.resolveEffectiveMetricLimit.mockReturnValue(null);

        await expect(
            getWorkspaceFileStorageUsage({
                workspaceId: 'workspace-1',
            }),
        ).resolves.toMatchObject({
            usedBytes: 2048,
            limitBytes: null,
            remainingBytes: null,
            unlimited: true,
            overLimit: false,
        });
    });

    it('signale un dépassement sans produire une capacité restante négative', async () => {
        mocks.getWorkspaceEffectiveEntitlement
            .mockResolvedValue({
                subscription: {},
                plan: {},
                effectiveCapabilities: { limits: {} },
            });
        mocks.getUsageMetricValue.mockResolvedValue(1200);
        mocks.resolveEffectiveMetricLimit.mockReturnValue(1000);

        await expect(
            getWorkspaceFileStorageUsage({
                workspaceId: 'workspace-1',
            }),
        ).resolves.toMatchObject({
            usedBytes: 1200,
            limitBytes: 1000,
            remainingBytes: 0,
            unlimited: false,
            overLimit: true,
        });
    });
});
