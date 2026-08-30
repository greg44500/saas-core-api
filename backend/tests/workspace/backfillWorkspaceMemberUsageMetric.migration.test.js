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
    backfillWorkspaceMemberUsageMetric,
} from '../../migrations/backfillWorkspaceMemberUsageMetric.migration.js';
import {
    UsageMetric,
} from '../../modules/usageMetric/usageMetric.model.js';
import {
    WorkspaceMember,
} from '../../modules/workspaceMember/workspaceMember.model.js';

vi.mock('../../modules/usageMetric/usageMetric.model.js', () => ({
    UsageMetric: {
        findOneAndUpdate: vi.fn(),
    },
}));

vi.mock('../../modules/workspaceMember/workspaceMember.model.js', () => ({
    WorkspaceMember: {
        aggregate: vi.fn(),
    },
}));


describe('backfillWorkspaceMemberUsageMetric', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('recalcule members depuis active et suspended uniquement', async () => {
        const exec = vi.fn().mockResolvedValue([
            { _id: 'workspace-a', value: 3 },
            { _id: 'workspace-b', value: 1 },
        ]);
        WorkspaceMember.aggregate.mockReturnValue({ exec });
        UsageMetric.findOneAndUpdate.mockResolvedValue({});

        const result = await backfillWorkspaceMemberUsageMetric();

        expect(WorkspaceMember.aggregate).toHaveBeenCalledWith([
            {
                $match: {
                    status: {
                        $in: [
                            WORKSPACE_MEMBER_STATUS.ACTIVE,
                            WORKSPACE_MEMBER_STATUS.SUSPENDED,
                        ],
                    },
                },
            },
            {
                $group: {
                    _id: '$workspace',
                    value: { $sum: 1 },
                },
            },
        ]);
        expect(UsageMetric.findOneAndUpdate).toHaveBeenCalledTimes(2);
        expect(result).toEqual({ workspacesUpdated: 2 });
    });
});
