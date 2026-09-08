import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    PLAN_STATUS,
} from '../../constants/plan.constants.js';
import {
    listCommercialInvitationOffers,
} from '../../modules/commercialInvitation/commercialInvitationOfferCatalog.service.js';
import { Plan } from '../../modules/plan/plan.model.js';

vi.mock('../../modules/plan/plan.model.js', () => ({
    Plan: {
        find: vi.fn(),
    },
}));

describe('listCommercialInvitationOffers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('filtre serveur les offres privées réellement compatibles avec D-020', async () => {
        const eligibleFree = {
            _id: 'free-private',
            name: 'Découverte',
            trialEnabled: false,
            priceMonthlyExclTaxMinor: 0,
            priceYearlyExclTaxMinor: 0,
        };
        const eligibleTrial = {
            _id: 'trial-private',
            name: 'Beta Premium',
            trialEnabled: true,
            priceMonthlyExclTaxMinor: 7900,
            priceYearlyExclTaxMinor: 79000,
        };
        const eligibleYearlyOnlyTrial = {
            _id: 'trial-yearly-private',
            name: 'Beta annuelle',
            trialEnabled: true,
            priceMonthlyExclTaxMinor: 0,
            priceYearlyExclTaxMinor: 79000,
        };
        const forbiddenFreeTrial = {
            _id: 'trial-free-private',
            name: 'Trial gratuit incohérent',
            trialEnabled: true,
            priceMonthlyExclTaxMinor: 0,
            priceYearlyExclTaxMinor: 0,
        };
        const forbiddenPaidPermanent = {
            _id: 'paid-private',
            name: 'Premium privé',
            trialEnabled: false,
            priceMonthlyExclTaxMinor: 7900,
            priceYearlyExclTaxMinor: 79000,
        };

        const query = {
            select: vi.fn().mockReturnThis(),
            sort: vi.fn().mockReturnThis(),
            lean: vi.fn().mockResolvedValue([
                eligibleFree,
                eligibleTrial,
                eligibleYearlyOnlyTrial,
                forbiddenFreeTrial,
                forbiddenPaidPermanent,
            ]),
        };

        Plan.find.mockReturnValue(query);

        const result = await listCommercialInvitationOffers();

        expect(Plan.find).toHaveBeenCalledWith({
            status: PLAN_STATUS.ACTIVE,
            isPublic: false,
            systemRole: null,
        });
        expect(result).toEqual([
            eligibleFree,
            eligibleTrial,
            eligibleYearlyOnlyTrial,
        ]);
    });
});
