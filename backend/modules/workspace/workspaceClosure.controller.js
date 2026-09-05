import {
    archiveWorkspaceByOwner,
} from './workspaceClosure.service.js';

const archiveCurrentOwnerWorkspace = async (req, res) => {
    const workspace = await archiveWorkspaceByOwner({
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
            workspace,
        },
    });
};

export { archiveCurrentOwnerWorkspace };
