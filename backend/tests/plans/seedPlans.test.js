import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    PLAN_SYSTEM_ROLE,
} from '../../constants/plan.constants.js';
import {
    CORE_PLAN_FEATURE,
    CORE_PLAN_METRIC,
} from '../../modules/plan/planCapability.registry.js';
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

    it('n’accorde aucune feature par défaut tout en conservant les quotas d’upload', () => {
        const baselinePlan = INITIAL_PLAN_DEFINITIONS.find(
            (plan) => plan.systemRole === PLAN_SYSTEM_ROLE.BASELINE,
        );

        expect(baselinePlan.features).toEqual([]);
        expect(baselinePlan.features).not.toContain(
            CORE_PLAN_FEATURE.FILE_UPLOAD,
        );
        expect(
            baselinePlan.limits[CORE_PLAN_METRIC.FILE_UPLOADS_MONTHLY],
        ).toBe(10);
        expect(
            baselinePlan.limits[CORE_PLAN_METRIC.STORAGE_BYTES],
        ).toBe(100 * 1024 * 1024);
    });
});
