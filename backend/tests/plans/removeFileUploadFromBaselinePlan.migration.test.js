import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';


const mocks = vi.hoisted(() => ({
    findOne: vi.fn(),
    updateOne: vi.fn(),
}));

vi.mock(
    '../../modules/plan/plan.model.js',
    () => ({
        Plan: {
            findOne: mocks.findOne,
            collection: {
                updateOne: mocks.updateOne,
            },
        },
    }),
);

import {
    PLAN_SYSTEM_ROLE,
} from '../../constants/plan.constants.js';
import {
    CORE_PLAN_FEATURE,
} from '../../modules/plan/planCapability.registry.js';
import {
    removeFileUploadFromBaselinePlan,
} from '../../migrations/removeFileUploadFromBaselinePlan.migration.js';


const baselineId = {
    toString: () => 'baseline-plan-id',
};

const mockBaselinePlan = (features) => {
    const select = vi.fn().mockResolvedValue({
        _id: baselineId,
        features,
    });

    mocks.findOne.mockReturnValue({ select });

    return select;
};


describe('removeFileUploadFromBaselinePlan migration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('retire uniquement file_upload du Plan identifié par son rôle baseline', async () => {
        const select = mockBaselinePlan([
            CORE_PLAN_FEATURE.FILE_UPLOAD,
            CORE_PLAN_FEATURE.AUDIT_LOGS,
        ]);

        mocks.updateOne.mockResolvedValue({
            matchedCount: 1,
            modifiedCount: 1,
        });

        const result = await removeFileUploadFromBaselinePlan();

        expect(mocks.findOne).toHaveBeenCalledWith({
            systemRole: PLAN_SYSTEM_ROLE.BASELINE,
        });
        expect(select).toHaveBeenCalledWith('_id features');
        expect(mocks.updateOne).toHaveBeenCalledWith(
            {
                _id: baselineId,
                systemRole: PLAN_SYSTEM_ROLE.BASELINE,
            },
            {
                $pull: {
                    features: CORE_PLAN_FEATURE.FILE_UPLOAD,
                },
            },
        );
        expect(result).toEqual({
            modified: true,
            planId: 'baseline-plan-id',
        });
    });

    it('est idempotente lorsque file_upload est déjà absent', async () => {
        mockBaselinePlan([
            CORE_PLAN_FEATURE.AUDIT_LOGS,
        ]);

        const result = await removeFileUploadFromBaselinePlan();

        expect(mocks.updateOne).not.toHaveBeenCalled();
        expect(result).toEqual({
            modified: false,
            planId: 'baseline-plan-id',
        });
    });

    it('refuse de deviner un Plan par nom ou clé lorsque la baseline est absente', async () => {
        const select = vi.fn().mockResolvedValue(null);
        mocks.findOne.mockReturnValue({ select });

        await expect(
            removeFileUploadFromBaselinePlan(),
        ).rejects.toThrow('Le Plan baseline est introuvable');

        expect(mocks.findOne).toHaveBeenCalledTimes(1);
        expect(mocks.findOne).toHaveBeenCalledWith({
            systemRole: PLAN_SYSTEM_ROLE.BASELINE,
        });
        expect(mocks.updateOne).not.toHaveBeenCalled();
    });
});
