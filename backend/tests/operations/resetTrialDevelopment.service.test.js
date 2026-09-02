import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    RESETTABLE_COMMERCIAL_STATUSES,
    assertDevelopmentTrialResetAllowed,
} from '../../operations/development/resetTrialDevelopment.service.js';


describe('resetTrialDevelopment', () => {
    it('refuse absolument un environnement de production', () => {
        expect(() => assertDevelopmentTrialResetAllowed({
            nodeEnv: 'production',
            confirmed: true,
        })).toThrow(
            'La réinitialisation de trial est autorisée uniquement avec NODE_ENV=development.',
        );
    });

    it('exige une confirmation explicite même en développement', () => {
        expect(() => assertDevelopmentTrialResetAllowed({
            nodeEnv: 'development',
            confirmed: false,
        })).toThrow(
            'La réinitialisation exige --confirm-development-reset.',
        );
    });

    it('autorise uniquement les états de trial pouvant être nettoyés sans effacer un scénario de paiement', () => {
        expect(RESETTABLE_COMMERCIAL_STATUSES.has('trialing')).toBe(true);
        expect(RESETTABLE_COMMERCIAL_STATUSES.has('canceled')).toBe(true);
        expect(RESETTABLE_COMMERCIAL_STATUSES.has('expired')).toBe(true);
        expect(RESETTABLE_COMMERCIAL_STATUSES.has('active')).toBe(false);
        expect(RESETTABLE_COMMERCIAL_STATUSES.has('past_due')).toBe(false);
    });
});
