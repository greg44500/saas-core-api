import {
    acceptExistingPlatformInvitation,
    acceptNewPlatformInvitation,
} from './acceptPlatformInvitation.service.js';
import {
    deliverPlatformInvitation,
} from './platformInvitationDelivery.service.js';
import {
    createPlatformInvitation,
    listPendingPlatformInvitations,
    resendPlatformInvitation,
    revokePlatformInvitation,
} from './platformInvitation.service.js';


const toInvitationDto = (invitation) => {
    const populatedRole = invitation.role?.name
        ? {
            id: invitation.role._id.toString(),
            key: invitation.role.key,
            name: invitation.role.name,
        }
        : undefined;

    return {
        id: invitation._id.toString(),
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        email: invitation.emailCanonical,
        status: invitation.status,
        deliveryStatus: invitation.deliveryStatus,
        lastDeliveryAttemptAt: invitation.lastDeliveryAttemptAt,
        deliveredAt: invitation.deliveredAt,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
        role: populatedRole,
    };
};


const create = async (req, res) => {
    const { invitation, role, token } = await createPlatformInvitation({
        firstName: req.validated.body.firstName,
        lastName: req.validated.body.lastName,
        email: req.validated.body.email,
        roleId: req.validated.body.roleId,
        actorId: req.user.id,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    const deliveredInvitation = await deliverPlatformInvitation({
        invitation,
        role,
        token,
    });

    res.status(201).json({
        status: 'success',
        data: {
            invitation: {
                ...toInvitationDto(deliveredInvitation),
                role: {
                    id: role._id.toString(),
                    key: role.key,
                    name: role.name,
                },
            },
        },
    });
};


const list = async (req, res) => {
    const { invitations, pagination } =
        await listPendingPlatformInvitations({
            page: req.validated.query.page,
            limit: req.validated.query.limit,
        });

    res.status(200).json({
        status: 'success',
        data: {
            invitations: invitations.map(toInvitationDto),
        },
        meta: pagination,
    });
};


const resend = async (req, res) => {
    const { invitation, role, token } = await resendPlatformInvitation({
        invitationId: req.validated.params.invitationId,
        actorId: req.user.id,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    const deliveredInvitation = await deliverPlatformInvitation({
        invitation,
        role,
        token,
    });

    res.status(200).json({
        status: 'success',
        data: {
            invitation: {
                ...toInvitationDto(deliveredInvitation),
                role: {
                    id: role._id.toString(),
                    key: role.key,
                    name: role.name,
                },
            },
        },
    });
};


const revoke = async (req, res) => {
    await revokePlatformInvitation({
        invitationId: req.validated.params.invitationId,
        actorId: req.user.id,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.status(204).send();
};


const acceptExisting = async (req, res) => {
    const { membership, role } = await acceptExistingPlatformInvitation({
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
                role: {
                    id: role._id.toString(),
                    key: role.key,
                    name: role.name,
                },
                status: membership.status,
            },
        },
    });
};


const acceptNew = async (req, res) => {
    const { membership, role, user } = await acceptNewPlatformInvitation({
        token: req.validated.body.token,
        password: req.validated.body.password,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    /**
     * Aucun token de session n'est créé implicitement : le nouveau
     * collaborateur doit ensuite passer par le login normal du Core.
     */
    res.status(201).json({
        status: 'success',
        data: {
            user: {
                id: user._id.toString(),
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
            },
            membership: {
                id: membership._id.toString(),
                role: {
                    id: role._id.toString(),
                    key: role.key,
                    name: role.name,
                },
                status: membership.status,
            },
        },
    });
};


export {
    acceptExisting,
    acceptNew,
    create,
    list,
    resend,
    revoke,
};
