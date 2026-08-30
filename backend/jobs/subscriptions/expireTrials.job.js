import {
    expireExpiredTrials,
} from '../../modules/subscriptions/services/expireExpiredTrials.service.js';

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
