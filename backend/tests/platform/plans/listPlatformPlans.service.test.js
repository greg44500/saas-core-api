import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { Plan } from '../../../modules/plan/plan.model.js';
import {
    listPlatformPlans,
} from '../../../modules/platform/plans/services/listPlatformPlans.service.js';


vi.mock(
    '../../../modules/plan/plan.model.js',
    () => ({
        Plan: {
            find: vi.fn(),
            countDocuments: vi.fn(),
        },
    }),
);


describe('listPlatformPlans', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('retourne les plans administratifs avec pagination', async () => {
        const planDocuments = [
            {
                _id: 'plan-id',
                key: 'free',
                status: 'active',
                isPublic: true,
            },
        ];

        const query = {
            select: vi.fn().mockReturnThis(),
            sort: vi.fn().mockReturnThis(),
            skip: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            lean: vi.fn().mockResolvedValue(planDocuments),
        };

        Plan.find.mockReturnValue(query);
        Plan.countDocuments.mockResolvedValue(1);

        const result = await listPlatformPlans({
            page: 1,
            limit: 20,
        });

        expect(Plan.find).toHaveBeenCalledWith({});
        expect(query.skip).toHaveBeenCalledWith(0);
        expect(query.limit).toHaveBeenCalledWith(20);
        expect(result).toEqual({
            plans: planDocuments,
            pagination: {
                page: 1,
                limit: 20,
                total: 1,
                totalPages: 1,
            },
        });
    });

    it('refuse une pagination invalide', async () => {
        await expect(
            listPlatformPlans({
                page: 0,
                limit: 20,
            }),
        ).rejects.toThrow(
            'page must be an integer greater than or equal to 1',
        );

        await expect(
            listPlatformPlans({
                page: 1,
                limit: 101,
            }),
        ).rejects.toThrow(
            'limit must be an integer between 1 and 100',
        );

        expect(Plan.find).not.toHaveBeenCalled();
        expect(Plan.countDocuments).not.toHaveBeenCalled();
    });
});
