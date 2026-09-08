import {
    createRetentionHolderId,
} from '../../modules/retention/retentionLock.service.js';
import {
    runScheduledRetentionPolicies,
} from '../../modules/retention/retentionScheduler.service.js';

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
