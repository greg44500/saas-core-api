import {
    finalizeScheduledCancellations,
} from '../../modules/subscriptions/services/activeSubscriptionLifecycle.service.js';

/**
 * Exécute le runner opérationnel qui finalise les annulations planifiées.
 *
 * La sélection des souscriptions éligibles, les transitions de statut et les
 * garanties transactionnelles appartiennent au service
 * `finalizeScheduledCancellations`. Ce wrapper ne fait qu'injecter le contexte
 * d'exécution, journaliser l'issue du traitement et propager toute erreur à
 * l'ordonnanceur appelant.
 *
 * `now` est injectable afin que la frontière de période soit déterministe.
 * `batchSize` reste un paramètre de capacité transmis au service sans changer
 * ses règles métier. La rejouabilité et la sécurité en concurrence ne sont
 * donc pas implémentées ici mais dans la couche métier appelée.
 *
 * @param {object} [options]
 * @param {Date} [options.now] Instant de référence pour les échéances.
 * @param {number} [options.batchSize] Taille de lot éventuellement imposée.
 * @param {{info: Function, error: Function}} [options.logger] Logger opérationnel.
 * @returns {Promise<object>} Résultat retourné par le service de lifecycle.
 */
const runFinalizeScheduledCancellationsJob = async ({
    now = new Date(),
    batchSize,
    logger = console,
} = {}) => {
    if (!logger || typeof logger.info !== 'function' || typeof logger.error !== 'function') {
        throw new TypeError(
            'logger must expose info and error methods to finalize scheduled cancellations',
        );
    }

    try {
        const result = await finalizeScheduledCancellations({
            now,
            ...(batchSize === undefined ? {} : { batchSize }),
        });
        logger.info('Finalisation des annulations de souscriptions terminée.', result);
        return result;
    } catch (error) {
        logger.error('La finalisation des annulations de souscriptions a échoué.', {
            message: error.message,
        });
        throw error;
    }
};

export { runFinalizeScheduledCancellationsJob };
