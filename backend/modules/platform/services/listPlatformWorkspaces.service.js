import {
    Workspace,
} from '../../workspace/workspace.model.js';


/**
 * Retourne les workspaces de la plateforme avec pagination.
 *
 * L'autorisation d'accès appartient à la couche HTTP.
 * Ce service reste indépendant d'Express et expose uniquement
 * les données nécessaires à une vue administrative synthétique.
 *
 * @param {object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @returns {Promise<{
 *     workspaces: Array<object>,
 *     pagination: {
 *         page: number,
 *         limit: number,
 *         total: number,
 *         totalPages: number
 *     }
 * }>}
 */
const listPlatformWorkspaces = async ({
    page = 1,
    limit = 20,
}) => {
    if (!Number.isInteger(page) || page < 1) {
        throw new TypeError(
            'page must be an integer greater than or equal to 1',
        );
    }

    if (
        !Number.isInteger(limit)
        || limit < 1
        || limit > 100
    ) {
        throw new TypeError(
            'limit must be an integer between 1 and 100',
        );
    }

    const skip = (page - 1) * limit;

    const [
        workspaceDocuments,
        total,
    ] = await Promise.all([
        Workspace.find({})
            .select(
                '_id name status statusReason '
                + 'statusChangedAt createdBy '
                + 'createdAt updatedAt',
            )
            .sort({
                createdAt: -1,
                _id: -1,
            })
            .skip(skip)
            .limit(limit)
            .lean(),

        Workspace.countDocuments({}),
    ]);

    const workspaces = workspaceDocuments.map(
        (workspace) => ({
            id: workspace._id.toString(),
            name: workspace.name,
            status: workspace.status,
            statusReason:
                workspace.statusReason ?? null,
            statusChangedAt:
                workspace.statusChangedAt,
            createdBy:
                workspace.createdBy.toString(),
            createdAt:
                workspace.createdAt,
            updatedAt:
                workspace.updatedAt,
        }),
    );

    return {
        workspaces,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};


export {
    listPlatformWorkspaces,
};