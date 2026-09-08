import {
    createRetentionHolderId,
} from '../../modules/retention/retentionLock.service.js';
import {
    runScheduledRetentionPolicies,
} from '../../modules/retention/retentionScheduler.service.js';

/**
 * Exécute le runner périodique des policies de rétention planifiées.
 *
 * Ce wrapper ne décide ni quelles policies sont dues, ni quelles données sont
 * supprimées. Il délègue cette autorité au scheduler de rétention et fournit un
 * `holderId` unique utilisé par le mécanisme de lease pour éviter que plusieurs
 * exécutions concurrentes ne revendiquent la même responsabilité.
 *
 * `now` est injectable afin de rendre les échéances déterministes. Le runner
 * considère qu'un résultat contenant au moins une cible échouée constitue un
 * échec global d'exploitation : il lève alors une erreur après le retour du
 * scheduler afin que l'ordonnanceur externe puisse alerter ou relancer.
 *
 * Les règles de reprise, les locks, les suppressions et les effets persistants
 * restent implémentés dans les services de rétention appelés ; ce fichier ne
 * doit pas les dupliquer.
 *
 * @param {object} [options]
 * @param {Date} [options.now] Instant de référence pour la planification.
 * @param {string} [options.holderId] Identité du détenteur du lease de rétention.
 * @param {{info: Function, error: Function}} [options.logger] Logger opérationnel.
 * @returns {Promise<object>} Résultat agrégé retourné par le scheduler.
 */
const runScheduledRetentionJob = async ({
    now = new Date(),
    holderId = createRetentionHolderId('scheduled-retention'),
    logger = console,
} = {}) => {
    if (
        !logger
        || typeof logger.info !== 'function'
        || typeof logger.error !== 'function'
    ) {
        throw new TypeError(
            'logger must expose info and error methods to run retention',
        );
    }

    try {
        const result = await runScheduledRetentionPolicies({
            now,
            holderId,
        });

        if (result.failed > 0) {
            throw new Error(
                `Scheduled retention failed for ${result.failed} target(s)`,
            );
        }

        logger.info(
            'Maintenance de rétention terminée.',
            result,
        );

        return result;
    } catch (error) {
        logger.error(
            'La maintenance de rétention a échoué.',
            { message: error.message },
        );
        throw error;
    }
};

export { runScheduledRetentionJob };
