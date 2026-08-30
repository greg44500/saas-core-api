import {
    purgeDeletedFiles,
} from '../../modules/file/filePurge.service.js';

/**
 * Exécute la maintenance périodique des fichiers arrivés à échéance de purge.
 *
 * Le job reste mince : la sélection, la suppression physique, la transition
 * MongoDB et l'audit appartiennent au service File. L'ordonnanceur reçoit toute
 * erreur afin de pouvoir alerter ou relancer l'exécution.
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
