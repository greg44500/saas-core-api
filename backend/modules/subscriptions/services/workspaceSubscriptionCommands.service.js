import { AppError } from '../../../utils/appError.js';
import { Subscription } from '../subscription.model.js';
import {
    resumeScheduledSubscriptionCancellation,
    scheduleActiveSubscriptionCancellation,
} from './activeSubscriptionLifecycle.service.js';
import { endTrialToFree } from './endTrialToFree.service.js';
import { grantTrial } from './grantTrial.service.js';
import {
    revokeScheduledSubscriptionDowngrade,
    scheduleSubscriptionDowngrade,
} from './scheduledDowngrade.service.js';

/**
 * Vérifie la frontière tenant avant toute primitive travaillant par
 * subscriptionId seul.
 *
 * `Subscription.workspace` est immutable : une fois cette appartenance
 * vérifiée, la primitive de cycle de vie ne peut pas être détournée vers un
 * autre workspace par une modification concurrente du rattachement.
 */
const assertWorkspaceSubscription = async ({
    workspaceId,
    subscriptionId,
}) => {
    const subscription = await Subscription.findOne({
        _id: subscriptionId,
        workspace: workspaceId,
    }).select('_id');

    if (!subscription) {
        throw new AppError(
            'Souscription introuvable dans ce workspace',
            404,
        );
    }
};

const grantWorkspaceTrial = (params) => grantTrial(params);

const endWorkspaceTrialToFree = (params) => endTrialToFree(params);

const scheduleWorkspaceSubscriptionCancellation = async ({
    workspaceId,
    subscriptionId,
    ...params
}) => {
    await assertWorkspaceSubscription({
        workspaceId,
        subscriptionId,
    });

    return scheduleActiveSubscriptionCancellation({
        subscriptionId,
        ...params,
    });
};

const resumeWorkspaceSubscriptionCancellation = async ({
    workspaceId,
    subscriptionId,
    ...params
}) => {
    await assertWorkspaceSubscription({
        workspaceId,
        subscriptionId,
    });

    return resumeScheduledSubscriptionCancellation({
        subscriptionId,
        ...params,
    });
};

const scheduleWorkspaceSubscriptionDowngrade = async ({
    workspaceId,
    subscriptionId,
    ...params
}) => {
    await assertWorkspaceSubscription({
        workspaceId,
        subscriptionId,
    });

    return scheduleSubscriptionDowngrade({
        subscriptionId,
        ...params,
    });
};

const revokeWorkspaceSubscriptionDowngrade = async ({
    workspaceId,
    subscriptionId,
    ...params
}) => {
    await assertWorkspaceSubscription({
        workspaceId,
        subscriptionId,
    });

    return revokeScheduledSubscriptionDowngrade({
        subscriptionId,
        ...params,
    });
};

export {
    assertWorkspaceSubscription,
    endWorkspaceTrialToFree,
    grantWorkspaceTrial,
    resumeWorkspaceSubscriptionCancellation,
    revokeWorkspaceSubscriptionDowngrade,
    scheduleWorkspaceSubscriptionCancellation,
    scheduleWorkspaceSubscriptionDowngrade,
};
