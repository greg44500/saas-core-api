import {
    PLAN_STATUS,
} from '../../constants/plan.constants.js';
import { Plan } from '../plan/plan.model.js';

/**
 * Retourne uniquement les Plans qu'un acteur Platform peut sélectionner dans
 * le formulaire D-020. Le filtrage reste serveur afin qu'un frontend ne puisse
 * jamais transformer un Plan public, baseline ou payant sans trial en offre
 * d'invitation commerciale.
 *
 * Un Plan avec trial n'est proposé que s'il possède au moins une périodicité
 * réellement payante ; l'intervalle exact reste revalidé à la création. Sans
 * trial, D-020 n'autorise qu'une offre privée entièrement gratuite, créée
 * ensuite en Subscription open_ended.
 */
const listCommercialInvitationOffers = async () => {
    const plans = await Plan.find({
        status: PLAN_STATUS.ACTIVE,
        isPublic: false,
        systemRole: null,
    })
        .select([
            '_id',
            'systemRole',
            'name',
            'description',
            'status',
            'isPublic',
            'displayOrder',
            'trialEnabled',
            'trialDurationDays',
            'currency',
            'priceMonthlyExclTaxMinor',
            'priceYearlyExclTaxMinor',
            'features',
            'limits',
        ].join(' '))
        .sort({ displayOrder: 1, name: 1, _id: 1 })
        .lean();

    return plans.filter((plan) => {
        if (plan.trialEnabled === true) {
            return plan.priceMonthlyExclTaxMinor > 0
                || plan.priceYearlyExclTaxMinor > 0;
        }

        return plan.priceMonthlyExclTaxMinor === 0
            && plan.priceYearlyExclTaxMinor === 0;
    });
};

export { listCommercialInvitationOffers };
