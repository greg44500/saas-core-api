import {
    finalizeScheduledCancellations,
} from '../../modules/subscriptions/services/activeSubscriptionLifecycle.service.js';

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
