import {
    expireExpiredTrials,
} from '../../modules/subscriptions/services/expireExpiredTrials.service.js';


/**
 * Exécute la maintenance périodique des trials commerciaux.
 *
 * Le job reste volontairement très mince : la sélection des trials, la
 * transition transactionnelle et l'audit appartiennent au service métier.
 * Cette séparation permet d'utiliser le même service depuis n'importe quel
 * ordonnanceur de production sans dupliquer les règles Subscription.
 *
 * L'erreur n'est pas absorbée. Un ordonnanceur doit recevoir un échec explicite
 * afin de pouvoir alerter et/ou relancer l'exécution selon sa propre politique.
 *
 * @param {object} [options]
 * @param {Date} [options.now]
 * @param {object} [options.logger]
 * @returns {Promise<object>}
 */
const runExpireTrialsJob = async ({
    now = new Date(),
    logger = console,
} = {}) => {
    if (
        !logger
        || typeof logger.info !== 'function'
        || typeof logger.error !== 'function'
    ) {
        throw new TypeError(
            'logger must expose info and error methods to run the trial expiration job',
        );
    }

    try {
        const result = await expireExpiredTrials({ now });

        logger.info(
            'Maintenance des trials commerciaux terminée.',
            result,
        );

        return result;
    } catch (error) {
        logger.error(
            'La maintenance des trials commerciaux a échoué.',
            {
                message: error.message,
            },
        );

        throw error;
    }
};


export {
    runExpireTrialsJob,
};
