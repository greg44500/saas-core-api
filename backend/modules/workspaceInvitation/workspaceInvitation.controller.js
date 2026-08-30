import {
    acceptWorkspaceInvitation,
} from './acceptWorkspaceInvitation.service.js';
import {
    deliverWorkspaceInvitation,
} from './workspaceInvitationDelivery.service.js';
import {
    resendWorkspaceInvitation,
} from './resendWorkspaceInvitation.service.js';
import {
    createWorkspaceInvitation,
    revokeWorkspaceInvitation,
} from './workspaceInvitation.service.js';
import {
    listWorkspaceInvitations,
} from './workspaceInvitationRead.service.js';

const toInvitationDto = (invitation) => ({
    id: invitation._id.toString(),
    email: invitation.emailCanonical,
    status: invitation.status,
    deliveryStatus: invitation.deliveryStatus,
    lastDeliveryAttemptAt: invitation.lastDeliveryAttemptAt,
    deliveredAt: invitation.deliveredAt,
    expiresAt: invitation.expiresAt,
    createdAt: invitation.createdAt,
});

const create = async (req, res) => {
    const { invitation, token } = await createWorkspaceInvitation({
        workspaceId: req.workspace._id,
        email: req.validated.body.email,
        roleId: req.validated.body.roleId,
        actorId: req.user.id,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    const deliveredInvitation = await deliverWorkspaceInvitation({
        invitation,
        token,
    });

    res.status(201).json({
        status: 'success',
        data: {
            invitation: toInvitationDto(deliveredInvitation),
        },
    });
};

const list = async (req, res) => {
    const { invitations, pagination } =
        await listWorkspaceInvitations({
            workspaceId: req.workspace._id,
            page: req.validated.query.page,
            limit: req.validated.query.limit,
        });

    res.status(200).json({
        status: 'success',
        data: { invitations },
        meta: pagination,
    });
};

const revoke = async (req, res) => {
    await revokeWorkspaceInvitation({
        workspaceId: req.workspace._id,
        invitationId: req.validated.params.invitationId,
        actorId: req.user.id,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.status(204).send();
};

const resend = async (req, res) => {
    const { invitation, token } = await resendWorkspaceInvitation({
        workspaceId: req.workspace._id,
        invitationId: req.validated.params.invitationId,
        actorId: req.user.id,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    const deliveredInvitation = await deliverWorkspaceInvitation({
        invitation,
        token,
    });

    res.status(200).json({
        status: 'success',
        data: {
            invitation: toInvitationDto(deliveredInvitation),
        },
    });
};

const accept = async (req, res) => {
    const { invitation, membership } =
        await acceptWorkspaceInvitation({
            token: req.validated.body.token,
            actorId: req.user.id,
            ipAddress: req.context.ipAddress,
            userAgent: req.context.userAgent,
        });

    res.status(200).json({
        status: 'success',
        data: {
            membership: {
                id: membership._id.toString(),
                workspaceId: invitation.workspace.toString(),
                roleId: membership.role.toString(),
                status: membership.status,
            },
        },
    });
};

export {
    accept,
    create,
    list,
    resend,
    revoke,
};
