import {
    closeWorkspaceByOwner,
} from './workspaceClosure.service.js';

const closeCurrentOwnerWorkspace = async (req, res) => {
    const closure = await closeWorkspaceByOwner({
        workspaceId: req.validated.params.workspaceId,
        actorId: req.user.id,
        currentPassword: req.validated.body.currentPassword,
        confirmationName: req.validated.body.confirmationName,
        ipAddress: req.context.ipAddress,
        userAgent: req.context.userAgent,
    });

    res.status(200).json({
        status: 'success',
        data: {
            workspace: closure,
        },
    });
};

export { closeCurrentOwnerWorkspace };
