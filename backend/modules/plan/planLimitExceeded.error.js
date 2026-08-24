import {
    AppError,
} from '../../utils/appError.js';


class PlanLimitExceededError extends AppError {
    constructor(
        message,
        metricKey,
    ) {
        super(message, 403);

        if (
            typeof metricKey !== 'string'
            || metricKey.trim() === ''
        ) {
            throw new TypeError(
                'La métrique de plan dépassée est obligatoire.',
            );
        }

        this.name = 'PlanLimitExceededError';
        this.metricKey = metricKey;
    }
}


export {
    PlanLimitExceededError,
};