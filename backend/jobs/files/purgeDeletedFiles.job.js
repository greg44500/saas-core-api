import {
    purgeDeletedFiles,
} from '../../modules/file/filePurge.service.js';

/**
 * Exécute la maintenance périodique des fichiers arrivés à échéance de purge.
 *
 * Le runner reste volontairement mince : la sélection des documents éligibles,
 * la suppression physique, la transition MongoDB, la mise à jour des usages et
 * l'audit appartiennent au service `purgeDeletedFiles`. Il ne tente donc jamais
 * de reconstruire ici une stratégie de suppression ou de compensation.
 *
 * `now` est injectable afin que la frontière de rétention soit déterministe.
 * `batchSize` borne le volume confié au service sans modifier ses garanties de
 * cohérence. Toute erreur est journalisée puis propagée pour que l'ordonnanceur
 * puisse alerter ou relancer sans confondre un échec avec un succès partiel.
 *
 * @param {object} [options]
 * @param {Date} [options.now] Instant de référence pour l'éligibilité à la purge.
 * @param {number} [options.batchSize] Taille de lot éventuellement imposée.
 * @param {{info: Function, error: Function}} [options.logger] Logger opérationnel.
 * @returns {Promise<object>} Résultat retourné par le service de purge.
 */
const runPurgeDeletedFilesJob = async ({
    now = new Date(),
    batchSize,
    logger = console,
} = {}) => {
    if (
        !logger
        || typeof logger.info !== 'function'
        || typeof logger.error !== 'function'
    ) {
        throw new TypeError(
            'logger must expose info and error methods to run the file purge job',
        );
    }

    try {
        const result = await purgeDeletedFiles({
            now,
            ...(batchSize === undefined ? {} : { batchSize }),
        });

        logger.info(
            'Maintenance de purge des fichiers terminée.',
            result,
        );

        return result;
    } catch (error) {
        logger.error(
            'La maintenance de purge des fichiers a échoué.',
            {
                message: error.message,
            },
        );

        throw error;
    }
};

export { runPurgeDeletedFilesJob };
