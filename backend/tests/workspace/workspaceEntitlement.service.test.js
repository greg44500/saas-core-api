import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    getWorkspaceEffectiveEntitlement,
} from '../../modules/subscriptions/subscription.service.js';
import {
    getWorkspaceEffectiveFeatures,
} from '../../modules/workspace/workspaceEntitlement.service.js';

vi.mock('../../modules/subscriptions/subscription.service.js', () => ({
    getWorkspaceEffectiveEntitlement: vi.fn(),
}));

describe('getWorkspaceEffectiveFeatures', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('retourne uniquement les clés de features effectives du workspace', async () => {
        getWorkspaceEffectiveEntitlement.mockResolvedValue({
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
        });

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

    it('refuse une lecture sans workspace', async () => {
        await expect(
            getWorkspaceEffectiveFeatures({}),
        ).rejects.toThrow(
            'workspaceId is required to read workspace effective features',
        );

        expect(getWorkspaceEffectiveEntitlement).not.toHaveBeenCalled();
    });
});
