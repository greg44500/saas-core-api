import { z } from 'zod';

import {
    BILLING_INTERVAL,
} from '../../constants/subscription.constants.js';

const objectIdSchema = (fieldName) => z
    .string()
    .regex(
        /^[a-f\d]{24}$/i,
        `${fieldName} invalide`,
    );

const workspaceIdParamsSchema = z.strictObject({
    workspaceId: objectIdSchema('workspaceId'),
});

const workspaceSubscriptionParamsSchema = z.strictObject({
    workspaceId: objectIdSchema('workspaceId'),
    subscriptionId: objectIdSchema('subscriptionId'),
});

const grantTrialBodySchema = z.strictObject({
    planId: objectIdSchema('planId'),
    billingInterval: z.enum([
        BILLING_INTERVAL.MONTHLY,
        BILLING_INTERVAL.YEARLY,
    ]),
});

const scheduleCancellationBodySchema = z.strictObject({
    reason: z
        .string()
        .trim()
        .min(1)
        .max(500)
        .nullable()
        .optional(),
});

const scheduleDowngradeBodySchema = z.strictObject({
    targetPlanId: objectIdSchema('targetPlanId'),
});

export {
    grantTrialBodySchema,
    scheduleCancellationBodySchema,
    scheduleDowngradeBodySchema,
    workspaceIdParamsSchema,
    workspaceSubscriptionParamsSchema,
};
