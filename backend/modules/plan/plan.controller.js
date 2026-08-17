import {
    listPublicPlans,
} from './plan.service.js';


/**
 * Convertit les limites Mongoose en objet JSON standard.
 *
 * Selon le mode de lecture et la configuration Mongoose, une Map peut rester
 * représentée par une instance de Map. JSON.stringify ne sérialise pas cette
 * structure comme un objet métier exploitable par le frontend.
 *
 * @param {Map<string, number | null> | object} limits
 * @returns {object}
 */
const serializePlanLimits = (limits) => {
    if (limits instanceof Map) {
        return Object.fromEntries(limits);
    }

    return limits ?? {};
};


/**
 * Retourne le catalogue des plans actifs et publics.
 *
 * Cette route ne nécessite pas d'authentification : elle alimente notamment
 * une future page de présentation des offres avant l'inscription.
 *
 * Le contrôleur construit explicitement le contrat public afin qu'un nouveau
 * champ interne ajouté au modèle Plan ne soit pas exposé automatiquement.
 */
const list = async (req, res) => {
    const plans = await listPublicPlans();

    res.status(200).json({
        status: 'success',
        data: {
            plans: plans.map((plan) => ({
                id: plan._id.toString(),
                key: plan.key,
                name: plan.name,
                description: plan.description,
                displayOrder: plan.displayOrder,
                currency: plan.currency,
                priceMonthlyExclTaxMinor:
                    plan.priceMonthlyExclTaxMinor,
                priceYearlyExclTaxMinor:
                    plan.priceYearlyExclTaxMinor,
                features: plan.features,
                limits: serializePlanLimits(plan.limits),
            })),
        },
    });
};


export { list };