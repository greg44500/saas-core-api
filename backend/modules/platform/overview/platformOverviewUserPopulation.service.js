import {
    WORKSPACE_MEMBER_STATUS,
} from '../../../constants/workspaceMember.constants.js';
import {
    WorkspaceMember,
} from '../../workspaceMember/workspaceMember.model.js';


const CURRENT_CLIENT_MEMBERSHIP_STATUSES = Object.freeze([
    WORKSPACE_MEMBER_STATUS.ACTIVE,
    WORKSPACE_MEMBER_STATUS.SUSPENDED,
]);

/**
 * Compte les utilisateurs possédant au moins une relation client Workspace
 * courante. Le groupement par `user` garantit qu'un même compte appartenant à
 * plusieurs workspaces n'est compté qu'une seule fois.
 */
const buildCurrentClientUserPopulationPipeline = () => [
    {
        $match: {
            status: {
                $in: CURRENT_CLIENT_MEMBERSHIP_STATUSES,
            },
        },
    },
    {
        $group: {
            _id: '$user',
        },
    },
    {
        $count: 'count',
    },
];

const createPlatformOverviewUserPopulationService = ({
    WorkspaceMemberModel = WorkspaceMember,
} = {}) => async () => {
    const [result] = await WorkspaceMemberModel.aggregate(
        buildCurrentClientUserPopulationPipeline(),
    );

    return {
        withCurrentClientAccess: result?.count ?? 0,
    };
};

const getPlatformOverviewUserPopulation =
    createPlatformOverviewUserPopulationService();


export {
    CURRENT_CLIENT_MEMBERSHIP_STATUSES,
    buildCurrentClientUserPopulationPipeline,
    createPlatformOverviewUserPopulationService,
    getPlatformOverviewUserPopulation,
};
