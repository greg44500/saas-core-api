import { applyScheduledDowngrades } from '../../modules/subscriptions/services/applyScheduledDowngrades.service.js';

const runApplyScheduledDowngradesJob = async ({
    now = new Date(),
    logger = console,
} = {}) => {
    if (!logger || typeof logger.info !== 'function' || typeof logger.error !== 'function') {
        throw new TypeError('logger must provide info() and error()');
    }

    try {
        const result = await applyScheduledDowngrades({ now });
        logger.info('Scheduled downgrades processed', result);
        return result;
    } catch (error) {
        logger.error('Scheduled downgrade job failed', error);
        throw error;
    }
};

export { runApplyScheduledDowngradesJob };
