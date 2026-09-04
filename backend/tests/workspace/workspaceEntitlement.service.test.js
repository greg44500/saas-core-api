import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    getNextEntitlementChangeAt,
} from '../../modules/entitlementOverride/entitlementOverrideSchedule.service.js';
import {
    getWorkspaceEffectiveEntitlement,
} from '../../modules/subscriptions/subscription.service.js';
import {
    getWorkspaceEffectiveFeatures,
    getWorkspaceEntitlementPresentation,
} from '../../modules/workspace/workspaceEntitlement.service.js';

vi.mock('../../modules/subscriptions/subscription.service.js', () => ({
    getWorkspaceEffectiveEntitlement: vi.fn(),
}));

vi.mock(
    '../../modules/entitlementOverride/entitlementOverrideSchedule.service.js',
    () => ({
        getNextEntitlementChangeAt: vi.fn(),
    }),
);

const entitlementFixture = {
    plan: {
        _id: 'plan-id',
        features: ['file_upload'],
    },
    effectiveCapabilities: {
        features: ['file_upload', 'team_management'],
        limits: { members: 5 },
        appliedOverrides: [
            {
                id: 'override-id',
                featureKey: 'team_management',
                reason: 'Internal commercial reason',
            },
        ],
    },
};

describe('workspaceEntitlement.service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getWorkspaceEffectiveEntitlement.mockResolvedValue(
            entitlementFixture,
        );
        getNextEntitlementChangeAt.mockResolvedValue(
            new Date('2026-09-05T08:00:00.000Z'),
        );
    });

    it('retourne uniquement les clés de features effectives du workspace', async () => {
        const result = await getWorkspaceEffectiveFeatures({
            workspaceId: 'workspace-id',
        });

        expect(getWorkspaceEffectiveEntitlement).toHaveBeenCalledWith({
            workspaceId: 'workspace-id',
        });
        expect(result).toEqual([
            'file_upload',
            'team_management',
        ]);
        expect(result).not.toContain('override-id');
        expect(result).not.toContain('Internal commercial reason');
    });

    it('retourne une présentation tenant minimale avec prochaine échéance', async () => {
        const at = new Date('2026-09-04T12:00:00.000Z');

        const result = await getWorkspaceEntitlementPresentation({
            workspaceId: 'workspace-id',
            at,
        });

        expect(result).toEqual({
            features: [
                'file_upload',
                'team_management',
            ],
            nextEntitlementChangeAt:
                new Date('2026-09-05T08:00:00.000Z'),
        });
        expect(getWorkspaceEffectiveEntitlement).toHaveBeenCalledWith({
            workspaceId: 'workspace-id',
            at,
        });
        expect(getNextEntitlementChangeAt).toHaveBeenCalledWith({
            workspaceId: 'workspace-id',
            at,
        });
        expect(result).not.toHaveProperty('appliedOverrides');
    });

    it('refuse une lecture sans workspace', async () => {
        await expect(
            getWorkspaceEffectiveFeatures({}),
        ).rejects.toThrow(
            'workspaceId is required to read workspace effective features',
        );

        await expect(
            getWorkspaceEntitlementPresentation({}),
        ).rejects.toThrow(
            'workspaceId is required to read workspace entitlement presentation',
        );

        expect(getWorkspaceEffectiveEntitlement).not.toHaveBeenCalled();
    });
});
