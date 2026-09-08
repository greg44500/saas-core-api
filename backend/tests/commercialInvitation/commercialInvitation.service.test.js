import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    PLAN_STATUS,
} from '../../constants/plan.constants.js';
import {
    BILLING_INTERVAL,
} from '../../constants/subscription.constants.js';
import {
    assertCommercialInvitationOfferIsCurrent,
    assertCommercialInvitationPlan,
    buildOfferSnapshot,
} from '../../modules/commercialInvitation/commercialInvitation.service.js';

const buildPrivatePlan = (overrides = {}) => ({
    name: 'Découverte',
    status: PLAN_STATUS.ACTIVE,
    isPublic: false,
    systemRole: null,
    trialEnabled: false,
    trialDurationDays: null,
    currency: 'EUR',
    priceMonthlyExclTaxMinor: 0,
    priceYearlyExclTaxMinor: 0,
    features: ['team_management', 'file_upload'],
    limits: new Map([
        ['storage_bytes', 104857600],
        ['members', 3],
    ]),
    ...overrides,
});

describe('commercialInvitation.service offer contract', () => {
    it('accepte une offre privée gratuite durable sans périodicité', () => {
        expect(() => assertCommercialInvitationPlan({
            plan: buildPrivatePlan(),
            billingInterval: BILLING_INTERVAL.NONE,
        })).not.toThrow();
    });

    it('refuse qu’une invitation commerciale expose un plan public', () => {
        expect(() => assertCommercialInvitationPlan({
            plan: buildPrivatePlan({ isPublic: true }),
            billingInterval: BILLING_INTERVAL.NONE,
        })).toThrow(
            'Le plan sélectionné n’est pas disponible pour une invitation commerciale',
        );
    });

    it('refuse le plan structurel baseline', () => {
        expect(() => assertCommercialInvitationPlan({
            plan: buildPrivatePlan({ systemRole: 'baseline' }),
            billingInterval: BILLING_INTERVAL.NONE,
        })).toThrow(
            'Le plan sélectionné n’est pas disponible pour une invitation commerciale',
        );
    });

    it('refuse de transformer un plan payant sans trial en accès permanent', () => {
        expect(() => assertCommercialInvitationPlan({
            plan: buildPrivatePlan({
                priceMonthlyExclTaxMinor: 7900,
                priceYearlyExclTaxMinor: 79000,
            }),
            billingInterval: BILLING_INTERVAL.NONE,
        })).toThrow(
            'Une invitation sans trial ne peut cibler qu’une offre entièrement gratuite dans D-020',
        );
    });

    it('exige monthly ou yearly pour un vrai trial', () => {
        const plan = buildPrivatePlan({
            trialEnabled: true,
            trialDurationDays: 14,
            priceMonthlyExclTaxMinor: 7900,
            priceYearlyExclTaxMinor: 79000,
        });

        expect(() => assertCommercialInvitationPlan({
            plan,
            billingInterval: BILLING_INTERVAL.NONE,
        })).toThrow(
            'Un trial commercial doit utiliser une périodicité mensuelle ou annuelle',
        );

        expect(() => assertCommercialInvitationPlan({
            plan,
            billingInterval: BILLING_INTERVAL.MONTHLY,
        })).not.toThrow();
    });

    it('normalise features et limits dans le snapshot', () => {
        const snapshot = buildOfferSnapshot({
            plan: buildPrivatePlan(),
            billingInterval: BILLING_INTERVAL.NONE,
        });

        expect(snapshot.features).toEqual([
            'file_upload',
            'team_management',
        ]);
        expect(Object.keys(snapshot.limits)).toEqual([
            'members',
            'storage_bytes',
        ]);
    });

    it('tolère un renommage mais refuse une dérive des droits', () => {
        const originalPlan = buildPrivatePlan();
        const offerSnapshot = buildOfferSnapshot({
            plan: originalPlan,
            billingInterval: BILLING_INTERVAL.NONE,
        });
        const invitation = { offerSnapshot };

        expect(() => assertCommercialInvitationOfferIsCurrent({
            invitation,
            plan: buildPrivatePlan({ name: 'Beta privée' }),
        })).not.toThrow();

        expect(() => assertCommercialInvitationOfferIsCurrent({
            invitation,
            plan: buildPrivatePlan({
                features: ['file_upload'],
            }),
        })).toThrow(
            'L’offre commerciale a été modifiée depuis l’envoi de cette invitation. Créez une nouvelle invitation.',
        );
    });
});
