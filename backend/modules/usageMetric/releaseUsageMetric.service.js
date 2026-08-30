import { USAGE_METRIC_PERIOD_TYPE } from '../../constants/usageMetric.constants.js';
import { UsageMetric } from './usageMetric.model.js';

/**
 * Libère une capacité d'une métrique d'état courant sans autoriser une valeur
 * négative. Cette primitive reste séparée des métriques cumulatives : retirer
 * un membre libère un siège, alors qu'un upload mensuel passé ne doit jamais
 * être "déconsommé" de la même manière.
 */
const releaseCurrentUsageMetric = async ({
    workspaceId,
    metricKey,
    amount = 1,
    actorId = null,
    session = null,
}) => {
    if (!workspaceId || !metricKey) {
        throw new TypeError(
            'workspaceId and metricKey are required to release a usage metric',
        );
    }

    if (!Number.isInteger(amount) || amount <= 0) {
        throw new TypeError(
            'amount must be an integer greater than 0',
        );
    }

    const options = {
        returnDocument: 'after',
        runValidators: true,
    };

    if (session) {
        options.session = session;
    }

    const usageMetric = await UsageMetric.findOneAndUpdate(
        {
            workspace: workspaceId,
            metricKey: metricKey.trim().toLowerCase(),
            periodType: USAGE_METRIC_PERIOD_TYPE.CURRENT,
            periodStart: null,
            value: { $gte: amount },
        },
        {
            $inc: { value: -amount },
            $set: { updatedBy: actorId },
        },
        options,
    );

    if (!usageMetric) {
        throw new Error(
            'Current usage metric cannot be released safely',
        );
    }

    return usageMetric;
};

export { releaseCurrentUsageMetric };
