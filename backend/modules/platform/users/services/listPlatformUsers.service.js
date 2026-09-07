import { WORKSPACE_MEMBER_STATUS } from '../../../../constants/workspaceMember.constants.js';
import { User } from '../../../users/user.model.js';
import { WorkspaceMember } from '../../../workspaceMember/workspaceMember.model.js';


const CURRENT_CLIENT_MEMBERSHIP_STATUSES = Object.freeze([
    WORKSPACE_MEMBER_STATUS.ACTIVE,
    WORKSPACE_MEMBER_STATUS.SUSPENDED,
]);


/**
 * Retourne les utilisateurs possédant une relation client Workspace courante.
 *
 * L'identité User reste globale, mais la liste "Clients > Utilisateurs" ne doit
 * pas mélanger les collaborateurs internes de Platform Team avec les clients du
 * SaaS. Un utilisateur présent dans les deux populations reste naturellement
 * visible ici s'il possède aussi un WorkspaceMember actif ou suspendu.
 *
 * La sélection est effectuée en base avant la pagination afin que le total et
 * les pages restent cohérents lorsqu'un même utilisateur appartient à plusieurs
 * workspaces.
 */
const listPlatformUsers = async ({
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

    const [aggregation = { users: [], total: [] }] = await User.aggregate([
        {
            $lookup: {
                from: WorkspaceMember.collection.name,
                localField: '_id',
                foreignField: 'user',
                pipeline: [
                    {
                        $match: {
                            status: {
                                $in: CURRENT_CLIENT_MEMBERSHIP_STATUSES,
                            },
                        },
                    },
                    {
                        $limit: 1,
                    },
                    {
                        $project: {
                            _id: 1,
                        },
                    },
                ],
                as: 'currentWorkspaceMemberships',
            },
        },
        {
            $match: {
                'currentWorkspaceMemberships.0': {
                    $exists: true,
                },
            },
        },
        {
            $sort: {
                createdAt: -1,
                _id: -1,
            },
        },
        {
            $facet: {
                users: [
                    {
                        $skip: skip,
                    },
                    {
                        $limit: limit,
                    },
                    {
                        $project: {
                            _id: 1,
                            firstName: 1,
                            lastName: 1,
                            email: 1,
                            status: 1,
                            emailVerifiedAt: 1,
                            lastLoginAt: 1,
                            createdAt: 1,
                            updatedAt: 1,
                        },
                    },
                ],
                total: [
                    {
                        $count: 'value',
                    },
                ],
            },
        },
    ]);

    const userDocuments = aggregation.users ?? [];
    const total = aggregation.total?.[0]?.value ?? 0;

    const users = userDocuments.map((user) => ({
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        status: user.status,
        emailVerifiedAt: user.emailVerifiedAt ?? null,
        lastLoginAt: user.lastLoginAt ?? null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    }));

    return {
        users,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

export {
    CURRENT_CLIENT_MEMBERSHIP_STATUSES,
    listPlatformUsers,
};
