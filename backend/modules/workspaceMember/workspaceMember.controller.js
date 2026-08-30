import {
    removeWorkspaceMember,
    suspendWorkspaceMember,
    updateWorkspaceMemberRole,
} from './workspaceMember.service.js';

const serializeMember = (membership) => ({
    id: membership._id.toString(),
    userId: membership.user.toString(),
    roleId: membership.role?._id
        ? membership.role._id.toString()
        : membership.role.toString(),
    status: membership.status,
    joinedAt: membership.joinedAt,
    updatedAt: membership.updatedAt,
});

const updateRole = async (req, res) => {
    const membership = await updateWorkspaceMemberRole({
        workspaceId: req.workspace._id,
        memberId: req.validated.params.memberId,
        roleId: req.validated.body.roleId,
        actorId: req.user.id,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.status(200).json({
        status: 'success',
        data: { member: serializeMember(membership) },
    });
};

const suspend = async (req, res) => {
    const membership = await suspendWorkspaceMember({
        workspaceId: req.workspace._id,
        memberId: req.validated.params.memberId,
        actorId: req.user.id,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.status(200).json({
        status: 'success',
        data: { member: serializeMember(membership) },
    });
};

const remove = async (req, res) => {
    await removeWorkspaceMember({
        workspaceId: req.workspace._id,
        memberId: req.validated.params.memberId,
        actorId: req.user.id,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.status(204).send();
};

export { remove, suspend, updateRole };
