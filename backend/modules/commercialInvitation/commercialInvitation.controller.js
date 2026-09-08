import {
    acceptCommercialInvitation,
} from './acceptCommercialInvitation.service.js';
import {
    deliverCommercialInvitation,
} from './commercialInvitationDelivery.service.js';
import {
    createCommercialInvitation,
    listCommercialInvitations,
    previewCommercialInvitation,
    resendCommercialInvitation,
    revokeCommercialInvitation,
} from './commercialInvitation.service.js';

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

/**
 * Sérialise une invitation sans exposer son hash de token.
 *
 * `planOverride` est utilisé juste après create/resend car le document retourné
 * par la livraison n'est pas peuplé. Le listing utilise naturellement le Plan
 * déjà peuplé par son service.
 */
const toAdminInvitationDto = (invitation, planOverride = null) => {
    const resolvedPlan = planOverride ?? invitation.plan;

    return {
        id: invitation._id.toString(),
        email: invitation.emailCanonical,
        workspaceName: invitation.workspaceName,
        status: invitation.status,
        deliveryStatus: invitation.deliveryStatus,
        lastDeliveryAttemptAt: invitation.lastDeliveryAttemptAt,
        deliveredAt: invitation.deliveredAt,
        expiresAt: invitation.expiresAt,
        acceptedAt: invitation.acceptedAt,
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
    };
};

const create = async (req, res) => {
    const { invitation, plan, token } = await createCommercialInvitation({
        email: req.validated.body.email,
        planId: req.validated.body.planId,
        workspaceName: req.validated.body.workspaceName,
        billingInterval: req.validated.body.billingInterval,
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

/**
 * La preview ne renvoie volontairement pas l'adresse email destinataire. Le
 * bearer token suffit à présenter l'offre, mais une fuite du lien ne doit pas
 * exposer en plus une donnée personnelle inutile à cette étape.
 */
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

export {
    accept,
    create,
    list,
    preview,
    resend,
    revoke,
    toAdminInvitationDto,
    toOfferDto,
};
