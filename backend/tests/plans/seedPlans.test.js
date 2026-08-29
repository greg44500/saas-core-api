import {
    describe,
    expect,
    it,
} from 'vitest';

import { PLAN_KEY } from '../../constants/plan.constants.js';
import {
    INITIAL_PLAN_DEFINITIONS,
} from '../../seeds/seedPlans.js';


describe('seedPlans', () => {
    it('définit explicitement le plan Free sans trial', () => {
        const freePlan = INITIAL_PLAN_DEFINITIONS.find(
            (plan) => plan.key === PLAN_KEY.FREE,
        );

        expect(freePlan).toBeDefined();
        expect(freePlan.trialEnabled).toBe(false);
        expect(freePlan.trialDurationDays).toBeNull();
    });
});