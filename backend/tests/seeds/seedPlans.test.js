import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { PLAN_KEY } from '../../constants/plan.constants.js';

import { Plan } from '../../modules/plan/plan.model.js';

import {
    INITIAL_PLAN_DEFINITIONS,
    seedPlans,
} from '../../seeds/seedPlans.js';


describe('seedPlans', () => {
    afterEach(() => {
        // Empêche les mocks Mongoose de modifier les tests suivants.
        vi.restoreAllMocks();
    });


    it('crée le plan gratuit lorsqu’il est absent', async () => {
        const findOneSpy = vi
            .spyOn(Plan, 'findOne')
            .mockResolvedValue(null);

        const saveSpy = vi
            .spyOn(Plan.prototype, 'save')
            .mockImplementation(async function savePlan() {
                return this;
            });

        const result = await seedPlans();

        expect(findOneSpy).toHaveBeenCalledOnce();

        expect(findOneSpy).toHaveBeenCalledWith({
            key: PLAN_KEY.FREE,
        });

        expect(saveSpy).toHaveBeenCalledOnce();

        expect(result).toEqual({
            created: [PLAN_KEY.FREE],
            skipped: [],
        });

        expect(INITIAL_PLAN_DEFINITIONS).toHaveLength(1);
    });


    it('ne recrée pas le plan gratuit lorsqu’il existe déjà', async () => {
        const existingPlan = {
            _id: 'existing-plan-id',
            key: PLAN_KEY.FREE,
        };

        vi.spyOn(Plan, 'findOne')
            .mockResolvedValue(existingPlan);

        const saveSpy = vi.spyOn(Plan.prototype, 'save');

        const result = await seedPlans();

        expect(saveSpy).not.toHaveBeenCalled();

        expect(result).toEqual({
            created: [],
            skipped: [PLAN_KEY.FREE],
        });
    });
});