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
            resetEnabled: true,
            confirmed: true,
        })).toThrow(
            'La réinitialisation de trial est autorisée uniquement avec NODE_ENV=development.',
        );
    });

    it('reste désactivé par défaut même en développement', () => {
        expect(() => assertDevelopmentTrialResetAllowed({
            nodeEnv: 'development',
            resetEnabled: false,
            confirmed: true,
        })).toThrow(
            'La réinitialisation de données de développement est désactivée.',
        );
    });

    it('exige une confirmation explicite lorsque la capability de reset est activée', () => {
        expect(() => assertDevelopmentTrialResetAllowed({
            nodeEnv: 'development',
            resetEnabled: true,
            confirmed: false,
        })).toThrow(
            'La réinitialisation exige --confirm-development-reset.',
        );
    });

    it('accepte uniquement development + capability + confirmation', () => {
        expect(() => assertDevelopmentTrialResetAllowed({
            nodeEnv: 'development',
            resetEnabled: true,
            confirmed: true,
        })).not.toThrow();
    });

    it('autorise uniquement les états de trial pouvant être nettoyés sans effacer un scénario de paiement', () => {
        expect(RESETTABLE_COMMERCIAL_STATUSES.has('trialing')).toBe(true);
        expect(RESETTABLE_COMMERCIAL_STATUSES.has('canceled')).toBe(true);
        expect(RESETTABLE_COMMERCIAL_STATUSES.has('expired')).toBe(true);
        expect(RESETTABLE_COMMERCIAL_STATUSES.has('active')).toBe(false);
        expect(RESETTABLE_COMMERCIAL_STATUSES.has('past_due')).toBe(false);
    });
});
