import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    PLAN_SYSTEM_ROLE,
} from '../../constants/plan.constants.js';
import {
    INITIAL_PLAN_DEFINITIONS,
} from '../../seeds/seedPlans.js';


describe('seedPlans', () => {
    it('définit explicitement le plan baseline sans trial', () => {
        const baselinePlan = INITIAL_PLAN_DEFINITIONS.find(
            (plan) => plan.systemRole === PLAN_SYSTEM_ROLE.BASELINE,
        );

        expect(baselinePlan).toBeDefined();
        expect(baselinePlan.trialEnabled).toBe(false);
        expect(baselinePlan.trialDurationDays).toBeNull();
    });
});