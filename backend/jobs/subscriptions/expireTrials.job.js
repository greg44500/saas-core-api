import {
    expireExpiredTrials,
} from '../../modules/subscriptions/services/expireExpiredTrials.service.js';

/**
 * Exécute le runner opérationnel de maintenance des trials arrivés à échéance.
 *
 * Ce module ne décide pas quelles souscriptions doivent expirer et ne porte
 * aucune règle commerciale : cette responsabilité appartient au service
 * `expireExpiredTrials`. Le runner fournit uniquement le contexte d'exécution,
 * journalise le résultat puis propage toute erreur afin que l'ordonnanceur
 * externe puisse détecter un échec réel.
 *
 * `now` est injectable pour rendre la frontière temporelle déterministe dans
 * les tests et lors d'une exécution contrôlée. `batchSize` est transmis au
 * service sans modifier sa stratégie de traitement. La rejouabilité et les
 * protections de concurrence restent donc des garanties du service métier,
 * pas de ce wrapper.
 *
 * @param {object} [options]
 * @param {Date} [options.now] Instant de référence de l'exécution.
 * @param {number} [options.batchSize] Taille de lot éventuellement imposée.
 * @param {{info: Function, error: Function}} [options.logger] Logger opérationnel.
 * @returns {Promise<object>} Résultat retourné par le service de maintenance.
 */
const runExpireTrialsJob = async ({
    now = new Date(),
    batchSize,
    logger = console,
} = {}) => {
    if (!logger || typeof logger.info !== 'function' || typeof logger.error !== 'function') {
        throw new TypeError(
            'logger must expose info and error methods to run the trial expiration job',
        );
    }

    try {
        const result = await expireExpiredTrials({
            now,
            ...(batchSize === undefined ? {} : { batchSize }),
        });
        logger.info('Maintenance des trials commerciaux terminée.', result);
        return result;
    } catch (error) {
        logger.error('La maintenance des trials commerciaux a échoué.', {
            message: error.message,
        });
        throw error;
    }
};

export { runExpireTrialsJob };
