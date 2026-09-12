import {
    acceptCommercialInvitation,
} from './acceptCommercialInvitation.service.js';
import {
    deliverCommercialInvitation,
} from './commercialInvitationDelivery.service.js';
import {
    listCommercialInvitationOffers,
} from './commercialInvitationOfferCatalog.service.js';
import {
    declineCommercialInvitation,
    registerCommercialInvitationRecipient,
    verifyCommercialInvitationRecipient,
} from './commercialInvitationRecipient.service.js';
import {
    createCommercialInvitation,
    listCommercialInvitations,
    previewCommercialInvitation,
    resendCommercialInvitation,
    revokeCommercialInvitation,
} from './commercialInvitation.service.js';
import { toPublicUser } from '../auth/publicUser.dto.js';

const serializeLimits = (limits) => {
    if (limits instanceof Map) {
        return Object.fromEntries(limits);
    }

    if (typeof limits?.toObject === 'function') {
        return limits.toObject();
    }

    return limits ?? {};
};

const toOfferDto = (snapshot) => ({
    planName: snapshot.planName,
    currency: snapshot.currency,
    billingInterval: snapshot.billingInterval,
    priceExclTaxMinor: snapshot.priceExclTaxMinor,
    trialEnabled: snapshot.trialEnabled,
    trialDurationDays: snapshot.trialDurationDays ?? null,
    features: [...(snapshot.features ?? [])],
    limits: serializeLimits(snapshot.limits),
});

const toSelectablePlanDto = (plan) => ({
    id: plan._id.toString(),
    name: plan.name,
    description: plan.description ?? null,
    status: plan.status,
    isPublic: plan.isPublic,
    isBaseline: false,
    displayOrder: plan.displayOrder,
    trialEnabled: plan.trialEnabled,
    trialDurationDays: plan.trialDurationDays ?? null,
    currency: plan.currency,
    priceMonthlyExclTaxMinor: plan.priceMonthlyExclTaxMinor,
    priceYearlyExclTaxMinor: plan.priceYearlyExclTaxMinor,
    features: [...(plan.features ?? [])],
    limits: serializeLimits(plan.limits),
});

const toAdminInvitationDto = (
    invitation,
    resolvedPlan = invitation.plan,
) => ({
    id: invitation._id.toString(),
    email: invitation.emailCanonical,
    workspaceName: invitation.workspaceName,
    reason: invitation.reason,
    status: invitation.status,
    deliveryStatus: invitation.deliveryStatus,
    lastDeliveryAttemptAt: invitation.lastDeliveryAttemptAt,
    deliveredAt: invitation.deliveredAt,
    expiresAt: invitation.expiresAt,
    acceptedAt: invitation.acceptedAt,
    declinedAt: invitation.declinedAt ?? null,
    revokedAt: invitation.revokedAt,
    revokeReason: invitation.revokeReason ?? null,
    plan: resolvedPlan?._id
        ? {
            id: resolvedPlan._id.toString(),
            name: resolvedPlan.name,
            status: resolvedPlan.status,
            isPublic: resolvedPlan.isPublic,
        }
        : {
            id: resolvedPlan?.toString() ?? null,
        },
    offer: toOfferDto(invitation.offerSnapshot),
    workspace: invitation.workspace?.toString() ?? null,
    subscription: invitation.subscription?.toString() ?? null,
    createdAt: invitation.createdAt,
    updatedAt: invitation.updatedAt,
});

const create = async (req, res) => {
    const { invitation, plan, token } = await createCommercialInvitation({
        email: req.validated.body.email,
        planId: req.validated.body.planId,
        workspaceName: req.validated.body.workspaceName,
        billingInterval: req.validated.body.billingInterval,
        reason: req.validated.body.reason,
        actorId: req.user.id,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    const deliveredInvitation = await deliverCommercialInvitation({
        invitation,
        plan,
        token,
    });

    res.status(201).json({
        status: 'success',
        data: {
            invitation: toAdminInvitationDto(
                deliveredInvitation ?? invitation,
                plan,
            ),
        },
    });
};

const list = async (req, res) => {
    const { invitations, pagination } = await listCommercialInvitations({
        page: req.validated.query.page,
        limit: req.validated.query.limit,
    });

    res.status(200).json({
        status: 'success',
        data: {
            invitations: invitations.map((invitation) =>
                toAdminInvitationDto(invitation)),
        },
        meta: pagination,
    });
};

const listOffers = async (req, res) => {
    const plans = await listCommercialInvitationOffers();

    res.status(200).json({
        status: 'success',
        data: {
            plans: plans.map(toSelectablePlanDto),
        },
    });
};

const resend = async (req, res) => {
    const { invitation, plan, token } = await resendCommercialInvitation({
        invitationId: req.validated.params.invitationId,
        actorId: req.user.id,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    const deliveredInvitation = await deliverCommercialInvitation({
        invitation,
        plan,
        token,
    });

    res.status(200).json({
        status: 'success',
        data: {
            invitation: toAdminInvitationDto(
                deliveredInvitation ?? invitation,
                plan,
            ),
        },
    });
};

const revoke = async (req, res) => {
    await revokeCommercialInvitation({
        invitationId: req.validated.params.invitationId,
        reason: req.validated.body.reason,
        actorId: req.user.id,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.status(204).send();
};

const preview = async (req, res) => {
    const invitation = await previewCommercialInvitation({
        token: req.validated.body.token,
    });

    res.status(200).json({
        status: 'success',
        data: {
            invitation: {
                workspaceName: invitation.workspaceName,
                expiresAt: invitation.expiresAt,
                offer: toOfferDto(invitation.offerSnapshot),
            },
        },
    });
};

const registerRecipient = async (req, res) => {
    const user = await registerCommercialInvitationRecipient({
        ...req.validated.body,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.status(201).json({
        status: 'success',
        data: {
            user: toPublicUser(user),
        },
    });
};

const verifyRecipient = async (req, res) => {
    await verifyCommercialInvitationRecipient({
        token: req.validated.body.token,
        userId: req.user.id,
    });

    res.status(200).json({
        status: 'success',
        data: {
            matchesRecipient: true,
        },
    });
};

const accept = async (req, res) => {
    const {
        invitation,
        plan,
        subscription,
        workspace,
    } = await acceptCommercialInvitation({
        token: req.validated.body.token,
        userId: req.user.id,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.status(201).json({
        status: 'success',
        data: {
            invitation: {
                id: invitation._id.toString(),
                status: invitation.status,
                acceptedAt: invitation.acceptedAt,
            },
            workspace: {
                id: workspace._id.toString(),
                name: workspace.name,
                status: workspace.status,
            },
            subscription: {
                id: subscription._id.toString(),
                plan: {
                    id: plan._id.toString(),
                    name: plan.name,
                },
                status: subscription.status,
                termType: subscription.termType,
                trialEndsAt: subscription.trialEndsAt ?? null,
                currentPeriodEnd: subscription.currentPeriodEnd ?? null,
            },
        },
    });
};

const decline = async (req, res) => {
    const invitation = await declineCommercialInvitation({
        token: req.validated.body.token,
        userId: req.user.id,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.status(200).json({
        status: 'success',
        data: {
            invitation: {
                id: invitation._id.toString(),
                status: invitation.status,
                declinedAt: invitation.declinedAt,
            },
        },
    });
};

export {
    accept,
    create,
    decline,
    list,
    listOffers,
    preview,
    registerRecipient,
    resend,
    revoke,
    toAdminInvitationDto,
    toOfferDto,
    toSelectablePlanDto,
    verifyRecipient,
};
