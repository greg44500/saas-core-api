import {
    createWorkspaceRole,
    deleteWorkspaceRole,
    listWorkspaceRoles,
    updateWorkspaceRole,
} from './role.service.js';

const list = async (req, res) => {
    const roles = await listWorkspaceRoles({
        workspaceId: req.workspace._id,
    });

    res.status(200).json({
        status: 'success',
        data: { roles },
    });
};

const create = async (req, res) => {
    const role = await createWorkspaceRole({
        workspaceId: req.workspace._id,
        actorId: req.user.id,
        actorPermissions: req.permissions,
        ...req.validated.body,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.status(201).json({
        status: 'success',
        data: { role },
    });
};

const update = async (req, res) => {
    const role = await updateWorkspaceRole({
        workspaceId: req.workspace._id,
        roleId: req.validated.params.roleId,
        actorId: req.user.id,
        actorPermissions: req.permissions,
        changes: req.validated.body,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.status(200).json({
        status: 'success',
        data: { role },
    });
};

const remove = async (req, res) => {
    await deleteWorkspaceRole({
        workspaceId: req.workspace._id,
        roleId: req.validated.params.roleId,
        actorId: req.user.id,
        actorPermissions: req.permissions,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.status(204).send();
};

export {
    create,
    list,
    remove,
    update,
};
