import { getPlatformWorkspace } from './services/getPlatformWorkspace.service.js';
import { listPlatformWorkspaces } from './services/listPlatformWorkspaces.service.js';
import { reactivatePlatformWorkspace } from './services/reactivatePlatformWorkspace.service.js';
import { suspendPlatformWorkspace } from './services/suspendPlatformWorkspace.service.js';

const listWorkspaces = async (req, res) => {
    const { workspaces, pagination } = await listPlatformWorkspaces({
        page: req.validated.query.page,
        limit: req.validated.query.limit,
    });

    res.status(200).json({
        status: 'success',
        data: { workspaces },
        meta: pagination,
    });
};

const getWorkspaceById = async (req, res) => {
    const workspace = await getPlatformWorkspace({
        workspaceId: req.validated.params.workspaceId,
    });

    if (!workspace) {
        return res.status(404).json({
            status: 'fail',
            message: 'Workspace introuvable',
        });
    }

    return res.status(200).json({
        status: 'success',
        data: { workspace },
    });
};

const suspendWorkspace = async (req, res) => {
    const workspace = await suspendPlatformWorkspace({
        workspaceId: req.validated.params.workspaceId,
        actorId: req.user.id,
        statusReason: req.validated.body.statusReason,
        statusReasonDetails: req.validated.body.statusReasonDetails ?? null,
        ipAddress: req.context?.ipAddress ?? null,
        userAgent: req.context?.userAgent ?? null,
    });

    return res.status(200).json({
        status: 'success',
        data: { workspace },
    });
};

const reactivateWorkspace = async (req, res) => {
    const workspace = await reactivatePlatformWorkspace({
        workspaceId: req.validated.params.workspaceId,
        actorId: req.user.id,
        ipAddress: req.context?.ipAddress ?? null,
        userAgent: req.context?.userAgent ?? null,
    });

    return res.status(200).json({
        status: 'success',
        data: { workspace },
    });
};

export {
    getWorkspaceById,
    listWorkspaces,
    reactivateWorkspace,
    suspendWorkspace,
};
