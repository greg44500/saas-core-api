import {
    applyScheduledDowngrades,
} from '../../modules/subscriptions/services/applyScheduledDowngrades.service.js';

/**
 * Exécute le runner opérationnel chargé d'appliquer les downgrades planifiés.
 *
 * Le calcul d'éligibilité, l'application du plan cible et les garanties de
 * cohérence appartiennent au service `applyScheduledDowngrades`. Ce wrapper
 * fournit seulement les paramètres d'exécution, journalise le résultat et
 * propage toute erreur afin qu'un ordonnanceur externe puisse constater
 * l'échec du job.
 *
 * `now` rend l'instant de bascule déterministe pour les tests et les reprises
 * contrôlées. `batchSize` limite le volume traité sans modifier la règle
 * commerciale. La rejouabilité, l'idempotence et la concurrence restent sous
 * l'autorité du service métier appelé.
 *
 * @param {object} [options]
 * @param {Date} [options.now] Instant de référence pour les échéances.
 * @param {number} [options.batchSize] Taille de lot éventuellement imposée.
 * @param {{info: Function, error: Function}} [options.logger] Logger opérationnel.
 * @returns {Promise<object>} Résultat retourné par le service de downgrade.
 */
const runApplyScheduledDowngradesJob = async ({
    now = new Date(),
    batchSize,
    logger = console,
} = {}) => {
    if (!logger || typeof logger.info !== 'function' || typeof logger.error !== 'function') {
        throw new TypeError('logger must provide info() and error()');
    }

    try {
        const result = await applyScheduledDowngrades({
            now,
            ...(batchSize === undefined ? {} : { batchSize }),
        });
        logger.info('Scheduled downgrades processed', result);
        return result;
    } catch (error) {
        logger.error('Scheduled downgrade job failed', { message: error.message });
        throw error;
    }
};

export { runApplyScheduledDowngradesJob };
