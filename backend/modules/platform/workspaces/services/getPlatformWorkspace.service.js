import mongoose from 'mongoose';

import { User } from '../../../users/user.model.js';
import { Workspace } from '../../../workspace/workspace.model.js';


/**
 * Construit la représentation minimale d'un acteur Platform.
 *
 * L'identifiant historique du Workspace est conservé même si le document User
 * n'est plus résoluble. Les champs d'identité deviennent alors null au lieu de
 * provoquer une erreur ou d'exposer une représentation technique imprévisible.
 *
 * @param {unknown} actorId
 * @param {Map<string, object>} usersById
 * @returns {{
 *     id: string,
 *     firstName: string|null,
 *     lastName: string|null,
 *     email: string|null
 * }|null}
 */
const toPlatformWorkspaceActor = (actorId, usersById) => {
    const id = actorId?.toString?.();

    if (!id) return null;

    const user = usersById.get(id);

    return {
        id,
        firstName: user?.firstName ?? null,
        lastName: user?.lastName ?? null,
        email: user?.email ?? null,
    };
};


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

    /*
     * Les trois références viennent exclusivement du document Workspace lu en
     * base. Le filtre `$in` est donc construit par le backend et non par une
     * entrée utilisateur. `mongoose.trusted()` autorise cet opérateur interne
     * sans désactiver la protection globale `sanitizeFilter` contre les filtres
     * MongoDB non fiables.
     */
    const actorIds = [
        workspace.statusChangedBy,
        workspace.createdBy,
        workspace.updatedBy,
    ].filter(Boolean);

    const actorUsers = actorIds.length > 0
        ? await User.find({
            _id: mongoose.trusted({
                $in: actorIds,
            }),
        })
            .select('_id firstName lastName email')
            .lean()
        : [];

    const usersById = new Map(
        actorUsers.map((user) => [
            user._id.toString(),
            user,
        ]),
    );

    return {
        id: workspace._id.toString(),
        name: workspace.name,
        status: workspace.status,
        statusReason: workspace.statusReason ?? null,
        statusReasonDetails: workspace.statusReasonDetails ?? null,
        statusChangedAt: workspace.statusChangedAt,
        statusChangedBy: toPlatformWorkspaceActor(
            workspace.statusChangedBy,
            usersById,
        ),
        createdBy: toPlatformWorkspaceActor(
            workspace.createdBy,
            usersById,
        ),
        updatedBy: toPlatformWorkspaceActor(
            workspace.updatedBy,
            usersById,
        ),
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
    };
};

export { getPlatformWorkspace };
