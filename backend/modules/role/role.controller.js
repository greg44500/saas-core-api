import { listWorkspaceRoles } from './role.service.js';

/**
 * Retourne les rôles du workspace courant déjà autorisé par les middlewares.
 */
const list = async (req, res) => {
    const roles = await listWorkspaceRoles({
        workspaceId: req.workspace._id,
    });

    res.status(200).json({
        status: 'success',
        data: {
            roles,
        },
    });
};

export { list };
