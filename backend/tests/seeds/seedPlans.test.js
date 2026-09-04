import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    PLAN_KEY,
    PLAN_SYSTEM_ROLE,
} from '../../constants/plan.constants.js';

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


    it('crée le plan baseline lorsqu’il est absent', async () => {
        const findOneSpy = vi
            .spyOn(Plan, 'findOne')
            .mockResolvedValue(null);

        const saveSpy = vi
            .spyOn(Plan.prototype, 'save')
            .mockImplementation(async function savePlan() {
                return this;
            });

        const result = await seedPlans();
        const baselineDefinition = INITIAL_PLAN_DEFINITIONS[0];

        expect(findOneSpy).toHaveBeenCalledOnce();

        expect(findOneSpy).toHaveBeenCalledWith({
            $or: [
                { systemRole: PLAN_SYSTEM_ROLE.BASELINE },
                { key: PLAN_KEY.FREE },
            ],
        });

        expect(saveSpy).toHaveBeenCalledOnce();

        expect(result).toEqual({
            created: [baselineDefinition.name],
            skipped: [],
        });

        expect(INITIAL_PLAN_DEFINITIONS).toHaveLength(1);
        expect(baselineDefinition.systemRole).toBe(
            PLAN_SYSTEM_ROLE.BASELINE,
        );
    });


    it('ne recrée pas le plan baseline lorsqu’il existe déjà', async () => {
        const existingPlan = {
            _id: 'existing-plan-id',
            key: PLAN_KEY.FREE,
            systemRole: PLAN_SYSTEM_ROLE.BASELINE,
        };

        vi.spyOn(Plan, 'findOne')
            .mockResolvedValue(existingPlan);

        const saveSpy = vi.spyOn(Plan.prototype, 'save');

        const result = await seedPlans();
        const baselineDefinition = INITIAL_PLAN_DEFINITIONS[0];

        expect(saveSpy).not.toHaveBeenCalled();

        expect(result).toEqual({
            created: [],
            skipped: [baselineDefinition.name],
        });
    });
});
