import {
    PLATFORM_TEAM_MEMBER_STATUS,
} from '../../../../constants/platformTeam.constants.js';
import { USER_STATUS } from '../../../../constants/userStatus.constants.js';
import { WORKSPACE_MEMBER_STATUS } from '../../../../constants/workspaceMember.constants.js';
import {
    PlatformTeamMember,
} from '../../../platformTeam/platformTeamMember.model.js';
import { User } from '../../../users/user.model.js';
import { WorkspaceMember } from '../../../workspaceMember/workspaceMember.model.js';


const CURRENT_CLIENT_MEMBERSHIP_STATUSES = Object.freeze([
    WORKSPACE_MEMBER_STATUS.ACTIVE,
    WORKSPACE_MEMBER_STATUS.SUSPENDED,
]);

const CURRENT_PLATFORM_TEAM_MEMBER_STATUSES = Object.freeze([
    PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
    PLATFORM_TEAM_MEMBER_STATUS.SUSPENDED,
]);

const CURRENT_CLIENT_USER_STATUSES = Object.freeze([
    USER_STATUS.ACTIVE,
    USER_STATUS.DISABLED,
    USER_STATUS.DELETION_REQUESTED,
]);


/**
 * Retourne les utilisateurs appartenant à la population cliente courante.
 *
 * La liste "Clients > Utilisateurs" représente exclusivement les comptes
 * rattachés à au moins un Workspace actif/suspendu qui ne sont pas des membres
 * actuels de la Platform Team. Un collaborateur interne conserve son identité
 * User et ses éventuels accès Workspace, mais n'entre pas dans les KPI ni les
 * listes clients tant que son appartenance Platform reste active ou suspendue.
 *
 * Les comptes clôturés et les memberships retirés sont historiques et sont
 * donc exclus de cette population opérationnelle.
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
            $match: {
                status: {
                    $in: CURRENT_CLIENT_USER_STATUSES,
                },
            },
        },
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
            $lookup: {
                from: PlatformTeamMember.collection.name,
                localField: '_id',
                foreignField: 'user',
                pipeline: [
                    {
                        $match: {
                            status: {
                                $in: CURRENT_PLATFORM_TEAM_MEMBER_STATUSES,
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
                as: 'currentPlatformMemberships',
            },
        },
        {
            $match: {
                'currentPlatformMemberships.0': {
                    $exists: false,
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
    CURRENT_CLIENT_USER_STATUSES,
    CURRENT_PLATFORM_TEAM_MEMBER_STATUSES,
    listPlatformUsers,
};
