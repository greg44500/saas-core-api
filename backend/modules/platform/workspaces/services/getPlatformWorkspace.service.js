import { Workspace } from '../../../workspace/workspace.model.js';

const getPlatformWorkspace = async ({ workspaceId }) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to get a platform workspace',
        );
    }

    const workspace = await Workspace.findById(workspaceId)
        .select(
            '_id name status statusReason '
            + 'statusReasonDetails '
            + 'statusChangedAt statusChangedBy '
            + 'createdBy updatedBy '
            + 'createdAt updatedAt',
        )
        .lean();

    if (!workspace) return null;

    return {
        id: workspace._id.toString(),
        name: workspace.name,
        status: workspace.status,
        statusReason: workspace.statusReason ?? null,
        statusReasonDetails: workspace.statusReasonDetails ?? null,
        statusChangedAt: workspace.statusChangedAt,
        statusChangedBy: workspace.statusChangedBy.toString(),
        createdBy: workspace.createdBy.toString(),
        updatedBy: workspace.updatedBy.toString(),
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
    };
};

export { getPlatformWorkspace };
