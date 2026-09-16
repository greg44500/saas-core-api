import { helpService } from './help.service.js';


const listWorkspaceHelp = async (req, res) => {
    const catalog = await helpService.getWorkspaceCatalog({
        workspace: req.workspace,
        permissions: req.permissions,
        role: req.role,
    });

    res.status(200).json({
        status: 'success',
        data: { catalog },
    });
};

const getWorkspaceHelpEntry = async (req, res) => {
    const entry = await helpService.getWorkspaceEntry({
        entryId: req.params.entryId,
        workspace: req.workspace,
        permissions: req.permissions,
        role: req.role,
    });

    res.status(200).json({
        status: 'success',
        data: { entry },
    });
};

const listPlatformHelp = async (req, res) => {
    const catalog = await helpService.getPlatformCatalog({
        user: req.user,
    });

    res.status(200).json({
        status: 'success',
        data: { catalog },
    });
};

const getPlatformHelpEntry = async (req, res) => {
    const entry = await helpService.getPlatformEntry({
        user: req.user,
        entryId: req.params.entryId,
    });

    res.status(200).json({
        status: 'success',
        data: { entry },
    });
};


export {
    getPlatformHelpEntry,
    getWorkspaceHelpEntry,
    listPlatformHelp,
    listWorkspaceHelp,
};
