import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    WORKSPACE_MEMBER_STATUS,
} from '../../constants/workspaceMember.constants.js';
import {
    reconcileWorkspaceMemberUsageMetric,
} from '../../migrations/reconcileWorkspaceMemberUsageMetric.migration.js';
import {
    UsageMetric,
} from '../../modules/usageMetric/usageMetric.model.js';
import {
    WorkspaceMember,
} from '../../modules/workspaceMember/workspaceMember.model.js';

vi.mock('../../modules/usageMetric/usageMetric.model.js', () => ({
    UsageMetric: {
        find: vi.fn(),
        updateOne: vi.fn(),
    },
}));

vi.mock('../../modules/workspaceMember/workspaceMember.model.js', () => ({
    WorkspaceMember: {
        countDocuments: vi.fn(),
    },
}));

const mockMetrics = (metrics) => {
    const lean = vi.fn().mockResolvedValue(metrics);
    const select = vi.fn().mockReturnValue({ lean });
    UsageMetric.find.mockReturnValue({ select });
};

describe('reconcileWorkspaceMemberUsageMetric', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('remet à zéro une métrique obsolète sans membre occupant', async () => {
        mockMetrics([
            { _id: 'metric-a', workspace: 'workspace-a', value: 2 },
        ]);
        WorkspaceMember.countDocuments.mockResolvedValue(0);
        UsageMetric.updateOne.mockResolvedValue({ modifiedCount: 1 });

        const result = await reconcileWorkspaceMemberUsageMetric();

        expect(WorkspaceMember.countDocuments).toHaveBeenCalledWith({
            workspace: 'workspace-a',
            status: {
                $in: [
                    WORKSPACE_MEMBER_STATUS.ACTIVE,
                    WORKSPACE_MEMBER_STATUS.SUSPENDED,
                ],
            },
        });
        expect(UsageMetric.updateOne).toHaveBeenCalledWith(
            { _id: 'metric-a' },
            {
                $set: {
                    value: 0,
                    updatedBy: null,
                },
            },
            { runValidators: true },
        );
        expect(result).toEqual({
            metricsScanned: 1,
            updated: 1,
            unchanged: 0,
        });
    });

    it('ne réécrit pas une métrique déjà cohérente', async () => {
        mockMetrics([
            { _id: 'metric-a', workspace: 'workspace-a', value: 2 },
        ]);
        WorkspaceMember.countDocuments.mockResolvedValue(2);

        const result = await reconcileWorkspaceMemberUsageMetric();

        expect(UsageMetric.updateOne).not.toHaveBeenCalled();
        expect(result).toEqual({
            metricsScanned: 1,
            updated: 0,
            unchanged: 1,
        });
    });

    it('reste rejouable après un état partiellement corrigé', async () => {
        mockMetrics([
            { _id: 'metric-a', workspace: 'workspace-a', value: 0 },
            { _id: 'metric-b', workspace: 'workspace-b', value: 1 },
        ]);
        WorkspaceMember.countDocuments
            .mockResolvedValueOnce(0)
            .mockResolvedValueOnce(3);
        UsageMetric.updateOne.mockResolvedValue({ modifiedCount: 1 });

        const result = await reconcileWorkspaceMemberUsageMetric();

        expect(UsageMetric.updateOne).toHaveBeenCalledTimes(1);
        expect(UsageMetric.updateOne).toHaveBeenCalledWith(
            { _id: 'metric-b' },
            {
                $set: {
                    value: 3,
                    updatedBy: null,
                },
            },
            { runValidators: true },
        );
        expect(result).toEqual({
            metricsScanned: 2,
            updated: 1,
            unchanged: 1,
        });
    });
});
