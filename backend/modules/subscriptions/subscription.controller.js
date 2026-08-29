import {
    getWorkspaceSubscriptionOverview,
} from './services/getWorkspaceSubscriptionOverview.service.js';
import {
    endWorkspaceTrialToFree,
    grantWorkspaceTrial,
    resumeWorkspaceSubscriptionCancellation,
    revokeWorkspaceSubscriptionDowngrade,
    scheduleWorkspaceSubscriptionCancellation,
    scheduleWorkspaceSubscriptionDowngrade,
} from './services/workspaceSubscriptionCommands.service.js';

const getWorkspaceOverview = async (req, res) => {
    const subscription = await getWorkspaceSubscriptionOverview({
        workspaceId: req.workspace._id,
    });

    res.status(200).json({
        status: 'success',
        data: { subscription },
    });
};

const grantTrial = async (req, res) => {
    const subscription = await grantWorkspaceTrial({
        workspaceId: req.workspace._id,
        planId: req.validated.body.planId,
        billingInterval: req.validated.body.billingInterval,
        actorId: req.user.id,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.status(201).json({
        status: 'success',
        data: { subscription },
    });
};

const endTrialToFree = async (req, res) => {
    const subscription = await endWorkspaceTrialToFree({
        workspaceId: req.workspace._id,
        actorId: req.user.id,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.status(200).json({
        status: 'success',
        data: { subscription },
    });
};

const scheduleCancellation = async (req, res) => {
    const subscription = await scheduleWorkspaceSubscriptionCancellation({
        workspaceId: req.workspace._id,
        subscriptionId: req.validated.params.subscriptionId,
        actorId: req.user.id,
        reason: req.validated.body.reason ?? null,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.status(200).json({
        status: 'success',
        data: { subscription },
    });
};

const resumeCancellation = async (req, res) => {
    const subscription = await resumeWorkspaceSubscriptionCancellation({
        workspaceId: req.workspace._id,
        subscriptionId: req.validated.params.subscriptionId,
        actorId: req.user.id,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.status(200).json({
        status: 'success',
        data: { subscription },
    });
};

const scheduleDowngrade = async (req, res) => {
    const subscription = await scheduleWorkspaceSubscriptionDowngrade({
        workspaceId: req.workspace._id,
        subscriptionId: req.validated.params.subscriptionId,
        targetPlanId: req.validated.body.targetPlanId,
        actorId: req.user.id,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.status(200).json({
        status: 'success',
        data: { subscription },
    });
};

const revokeDowngrade = async (req, res) => {
    const subscription = await revokeWorkspaceSubscriptionDowngrade({
        workspaceId: req.workspace._id,
        subscriptionId: req.validated.params.subscriptionId,
        actorId: req.user.id,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.status(200).json({
        status: 'success',
        data: { subscription },
    });
};

export {
    endTrialToFree,
    getWorkspaceOverview,
    grantTrial,
    resumeCancellation,
    revokeDowngrade,
    scheduleCancellation,
    scheduleDowngrade,
};
