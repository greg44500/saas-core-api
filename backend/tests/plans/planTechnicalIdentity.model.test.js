import { describe, expect, it } from 'vitest';

import { PLAN_SYSTEM_ROLE } from '../../constants/plan.constants.js';
import { Plan } from '../../modules/plan/plan.model.js';

function buildPlan(overrides = {}) {
    return new Plan({
        name: 'Offre personnalisée',
        currency: 'EUR',
        priceMonthlyExclTaxMinor: 1000,
        priceYearlyExclTaxMinor: 10000,
        ...overrides,
    });
}

describe('Plan technical identity', () => {
    it('génère une clé technique interne quand Platform ne la fournit pas', async () => {
        const plan = buildPlan();

        await plan.validate();

        expect(plan.key).toBe(`plan_${plan._id.toString()}`);
    });

    it('conserve le nom commercial indépendant de la clé générée', async () => {
        const plan = buildPlan({ name: 'Découverte' });

        await plan.validate();

        expect(plan.name).toBe('Découverte');
        expect(plan.key).not.toBe('decouverte');
    });

    it('accepte le rôle système baseline sans le déduire du nom commercial', async () => {
        const plan = buildPlan({
            name: 'Essentiel',
            systemRole: PLAN_SYSTEM_ROLE.BASELINE,
        });

        await plan.validate();

        expect(plan.systemRole).toBe(PLAN_SYSTEM_ROLE.BASELINE);
        expect(plan.name).toBe('Essentiel');
    });
});
