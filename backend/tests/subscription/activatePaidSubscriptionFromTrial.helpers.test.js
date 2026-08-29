import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    BILLING_INTERVAL,
} from '../../constants/subscription.constants.js';

import {
    calculatePaidPeriodEnd,
    resolvePaidPlanPrice,
} from '../../modules/subscriptions/services/activatePaidSubscriptionFromTrial.helpers.js';


describe('activatePaidSubscriptionFromTrial helpers', () => {
    describe('resolvePaidPlanPrice', () => {
        const plan = {
            priceMonthlyExclTaxMinor: 1990,
            priceYearlyExclTaxMinor: 19900,
        };

        it('sélectionne le snapshot mensuel du plan', () => {
            expect(
                resolvePaidPlanPrice(
                    plan,
                    BILLING_INTERVAL.MONTHLY,
                ),
            ).toBe(1990);
        });

        it('sélectionne le snapshot annuel du plan', () => {
            expect(
                resolvePaidPlanPrice(
                    plan,
                    BILLING_INTERVAL.YEARLY,
                ),
            ).toBe(19900);
        });
    });

    describe('calculatePaidPeriodEnd', () => {
        it('calcule une mensualisation calendaire depuis la date exacte du paiement', () => {
            const paidAt =
                new Date('2026-09-07T12:32:45.123Z');

            expect(
                calculatePaidPeriodEnd(
                    paidAt,
                    BILLING_INTERVAL.MONTHLY,
                ),
            ).toEqual(
                new Date('2026-10-07T12:32:45.123Z'),
            );
        });

        it('rabaisse le 31 au dernier jour du mois cible', () => {
            const paidAt =
                new Date('2026-01-31T10:15:00.000Z');

            expect(
                calculatePaidPeriodEnd(
                    paidAt,
                    BILLING_INTERVAL.MONTHLY,
                ),
            ).toEqual(
                new Date('2026-02-28T10:15:00.000Z'),
            );
        });

        it('calcule une annualisation calendaire depuis la date exacte du paiement', () => {
            const paidAt =
                new Date('2026-09-07T12:32:45.123Z');

            expect(
                calculatePaidPeriodEnd(
                    paidAt,
                    BILLING_INTERVAL.YEARLY,
                ),
            ).toEqual(
                new Date('2027-09-07T12:32:45.123Z'),
            );
        });

        it('gère le 29 février lors du passage vers une année non bissextile', () => {
            const paidAt =
                new Date('2028-02-29T08:00:00.000Z');

            expect(
                calculatePaidPeriodEnd(
                    paidAt,
                    BILLING_INTERVAL.YEARLY,
                ),
            ).toEqual(
                new Date('2029-02-28T08:00:00.000Z'),
            );
        });

        it('refuse une date de paiement invalide', () => {
            expect(() =>
                calculatePaidPeriodEnd(
                    new Date('invalid'),
                    BILLING_INTERVAL.MONTHLY,
                ),
            ).toThrow(TypeError);
        });
    });
});
