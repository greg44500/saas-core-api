import {
    SYSTEM_ROLE_KEY,
} from '../../../constants/role.constants.js';
import {
    PLATFORM_TEAM_MEMBER_STATUS,
} from '../../../constants/platformTeam.constants.js';
import {
    USER_STATUS,
} from '../../../constants/userStatus.constants.js';
import {
    WORKSPACE_MEMBER_STATUS,
} from '../../../constants/workspaceMember.constants.js';
import {
    PlatformTeamMember,
} from '../../platformTeam/platformTeamMember.model.js';
import { Role } from '../../role/role.model.js';
import { User } from '../../users/user.model.js';
import {
    WorkspaceMember,
} from '../../workspaceMember/workspaceMember.model.js';
import {
    calculateGrowthPercent,
    calculateSharePercent,
} from './platformOverview.service.js';


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

const countFacet = (facet) => facet?.[0]?.count ?? 0;

const toStatusCounts = (rows = []) => Object.fromEntries(
    rows.map((row) => [row._id, row.count]),
);

const createDistributionEntry = ({ count, total }) => ({
    count,
    percentage: calculateSharePercent(count, total),
});

/**
 * Construit la population client courante du cockpit Platform.
 *
 * Un utilisateur client est un User non clôturé qui possède au moins une
 * appartenance Workspace active ou suspendue. Les collaborateurs encore
 * rattachés à la Platform Team sont exclus, même s'ils disposent parallèlement
 * d'un accès Workspace pour du support, des tests ou de l'administration.
 *
 * Les répartitions sont volontairement mutuellement exclusives afin que leurs
 * totaux restent lisibles : accès actif vs suspendu uniquement, propriétaire
 * d'au moins un Workspace vs membre sans propriété actuelle.
 */
const buildCurrentClientUserPopulationPipeline = ({
    from,
    to,
    previousFrom,
    previousTo,
}) => [
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
                    $project: {
                        _id: 1,
                        role: 1,
                        status: 1,
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
                { $limit: 1 },
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
        $lookup: {
            from: Role.collection.name,
            localField: 'currentWorkspaceMemberships.role',
            foreignField: '_id',
            pipeline: [
                {
                    $project: {
                        _id: 1,
                        key: 1,
                    },
                },
            ],
            as: 'currentWorkspaceRoles',
        },
    },
    {
        $set: {
            hasActiveWorkspaceAccess: {
                $in: [
                    WORKSPACE_MEMBER_STATUS.ACTIVE,
                    '$currentWorkspaceMemberships.status',
                ],
            },
            hasOwnerWorkspaceRole: {
                $in: [
                    SYSTEM_ROLE_KEY.OWNER,
                    '$currentWorkspaceRoles.key',
                ],
            },
        },
    },
    {
        $facet: {
            total: [
                { $count: 'count' },
            ],
            byStatus: [
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                    },
                },
            ],
            withActiveWorkspaceAccess: [
                {
                    $match: {
                        hasActiveWorkspaceAccess: true,
                    },
                },
                { $count: 'count' },
            ],
            suspendedWorkspaceAccessOnly: [
                {
                    $match: {
                        hasActiveWorkspaceAccess: false,
                    },
                },
                { $count: 'count' },
            ],
            owners: [
                {
                    $match: {
                        hasOwnerWorkspaceRole: true,
                    },
                },
                { $count: 'count' },
            ],
            membersWithoutOwnership: [
                {
                    $match: {
                        hasOwnerWorkspaceRole: false,
                    },
                },
                { $count: 'count' },
            ],
            createdInPeriod: [
                {
                    $match: {
                        createdAt: {
                            $gte: from,
                            $lt: to,
                        },
                    },
                },
                { $count: 'count' },
            ],
            createdInPreviousPeriod: [
                {
                    $match: {
                        createdAt: {
                            $gte: previousFrom,
                            $lt: previousTo,
                        },
                    },
                },
                { $count: 'count' },
            ],
        },
    },
];

const createPlatformOverviewUserPopulationService = ({
    UserModel = User,
} = {}) => async ({
    from,
    to,
    previousFrom,
    previousTo,
}) => {
    const [result = {}] = await UserModel.aggregate(
        buildCurrentClientUserPopulationPipeline({
            from,
            to,
            previousFrom,
            previousTo,
        }),
    );

    const total = countFacet(result.total);
    const statusCounts = toStatusCounts(result.byStatus);
    const createdInPeriod = countFacet(result.createdInPeriod);
    const createdInPreviousPeriod = countFacet(
        result.createdInPreviousPeriod,
    );
    const activeCount = statusCounts[USER_STATUS.ACTIVE] ?? 0;
    const disabledCount = statusCounts[USER_STATUS.DISABLED] ?? 0;
    const deletionRequestedCount =
        statusCounts[USER_STATUS.DELETION_REQUESTED] ?? 0;
    const withActiveWorkspaceAccess = countFacet(
        result.withActiveWorkspaceAccess,
    );
    const suspendedWorkspaceAccessOnly = countFacet(
        result.suspendedWorkspaceAccessOnly,
    );
    const owners = countFacet(result.owners);
    const membersWithoutOwnership = countFacet(
        result.membersWithoutOwnership,
    );

    return {
        total,
        createdInPeriod,
        createdInPreviousPeriod,
        changePercent: calculateGrowthPercent(
            createdInPeriod,
            createdInPreviousPeriod,
        ),
        byStatus: {
            active: createDistributionEntry({
                count: activeCount,
                total,
            }),
            disabled: createDistributionEntry({
                count: disabledCount,
                total,
            }),
            deletionRequested: createDistributionEntry({
                count: deletionRequestedCount,
                total,
            }),
        },
        byAccess: {
            active: createDistributionEntry({
                count: withActiveWorkspaceAccess,
                total,
            }),
            suspendedOnly: createDistributionEntry({
                count: suspendedWorkspaceAccessOnly,
                total,
            }),
        },
        byRelationship: {
            owner: createDistributionEntry({
                count: owners,
                total,
            }),
            withoutOwnership: createDistributionEntry({
                count: membersWithoutOwnership,
                total,
            }),
        },
    };
};

const getPlatformOverviewUserPopulation =
    createPlatformOverviewUserPopulationService();


export {
    CURRENT_CLIENT_MEMBERSHIP_STATUSES,
    CURRENT_CLIENT_USER_STATUSES,
    CURRENT_PLATFORM_TEAM_MEMBER_STATUSES,
    buildCurrentClientUserPopulationPipeline,
    createPlatformOverviewUserPopulationService,
    getPlatformOverviewUserPopulation,
};
