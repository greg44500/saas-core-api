import mongoose from 'mongoose';

import {
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_STATUS,
} from '../../constants/subscription.constants.js';
import { SYSTEM_ROLE_KEY } from '../../constants/role.constants.js';
import { USER_STATUS } from '../../constants/userStatus.constants.js';
import { WORKSPACE_STATUS } from '../../constants/workspace.constants.js';
import {
    WORKSPACE_MEMBER_STATUS,
} from '../../constants/workspaceMember.constants.js';
import { AppError } from '../../utils/appError.js';
import { Subscription } from '../subscriptions/subscription.model.js';
import { WorkspaceMember } from '../workspaceMember/workspaceMember.model.js';
import { User } from './user.model.js';

const CLOSURE_IMPACT_MEMBERSHIP_STATUSES = Object.freeze([
    WORKSPACE_MEMBER_STATUS.ACTIVE,
    WORKSPACE_MEMBER_STATUS.SUSPENDED,
]);

const CLOSURE_IMPACT_SUBSCRIPTION_STATUSES = Object.freeze([
    SUBSCRIPTION_STATUS.TRIALING,
    SUBSCRIPTION_STATUS.ACTIVE,
    SUBSCRIPTION_STATUS.PAST_DUE,
]);

const isOwnerMembership = (membership) => (
    membership.role?.isSystem
    && membership.role?.key === SYSTEM_ROLE_KEY.OWNER
);

const workspaceIdToString = (workspaceId) => workspaceId.toString();

const getCurrentUserClosureImpact = async ({ userId }) => {
    if (!userId) {
        throw new TypeError(
            'userId is required to get account closure impact',
        );
    }

    const user = await User.findOne({
        _id: userId,
        status: USER_STATUS.ACTIVE,
    }).select('_id status');

    if (!user) {
        throw new AppError('Compte indisponible', 403);
    }

    const memberships = await WorkspaceMember.find({
        user: userId,
        status: mongoose.trusted({
            $in: CLOSURE_IMPACT_MEMBERSHIP_STATUSES,
        }),
    })
        .populate({
            path: 'role',
            select: '_id key isSystem workspace',
        })
        .populate({
            path: 'workspace',
            select: '_id name status',
        });

    const inconsistentMembership = memberships.find((membership) => (
        !membership.role
        || !membership.workspace
        || membership.role.workspace?.toString()
            !== membership.workspace._id.toString()
    ));

    if (inconsistentMembership) {
        throw new AppError(
            'Une appartenance workspace du compte est incohérente et doit être corrigée avant la fermeture',
            409,
        );
    }

    const ownedMemberships = memberships.filter(isOwnerMembership);
    const memberOnlyMemberships = memberships.filter(
        (membership) => !isOwnerMembership(membership),
    );

    const ownedWorkspaceIds = ownedMemberships.map(
        (membership) => membership.workspace._id,
    );

    const otherActiveMemberships = ownedWorkspaceIds.length > 0
        ? await WorkspaceMember.find({
            workspace: mongoose.trusted({ $in: ownedWorkspaceIds }),
            user: mongoose.trusted({ $ne: userId }),
            status: WORKSPACE_MEMBER_STATUS.ACTIVE,
        }).select('workspace')
        : [];

    const otherActiveMemberCountByWorkspace = new Map();

    for (const membership of otherActiveMemberships) {
        const workspaceId = workspaceIdToString(membership.workspace);
        otherActiveMemberCountByWorkspace.set(
            workspaceId,
            (otherActiveMemberCountByWorkspace.get(workspaceId) ?? 0) + 1,
        );
    }

    const affectedSubscriptions = ownedWorkspaceIds.length > 0
        ? await Subscription.find({
            workspace: mongoose.trusted({ $in: ownedWorkspaceIds }),
            kind: SUBSCRIPTION_KIND.COMMERCIAL,
            status: mongoose.trusted({
                $in: CLOSURE_IMPACT_SUBSCRIPTION_STATUSES,
            }),
        })
            .select('_id workspace plan kind status')
            .populate({
                path: 'plan',
                select: '_id name',
            })
        : [];

    const ownedWorkspaces = ownedMemberships.map((membership) => {
        const workspaceId = workspaceIdToString(membership.workspace._id);
        const willBeArchived =
            membership.workspace.status !== WORKSPACE_STATUS.CLOSED
            && membership.workspace.status !== WORKSPACE_STATUS.ARCHIVED;

        return {
            id: workspaceId,
            name: membership.workspace.name,
            currentStatus: membership.workspace.status,
            willBeArchived,
            otherActiveMemberCount:
                otherActiveMemberCountByWorkspace.get(workspaceId) ?? 0,
        };
    });

    const memberOnlyWorkspaces = memberOnlyMemberships.map((membership) => ({
        id: workspaceIdToString(membership.workspace._id),
        name: membership.workspace.name,
        currentStatus: membership.workspace.status,
        membershipStatus: membership.status,
        membershipWillBeRemoved: true,
    }));

    return {
        ownedWorkspaces,
        workspacesToArchive: ownedWorkspaces.filter(
            (workspace) => workspace.willBeArchived,
        ),
        memberOnlyWorkspaces,
        affectedSubscriptions: affectedSubscriptions.map((subscription) => ({
            id: subscription._id.toString(),
            workspaceId: subscription.workspace.toString(),
            kind: subscription.kind,
            status: subscription.status,
            plan: subscription.plan
                ? {
                    id: subscription.plan._id.toString(),
                    name: subscription.plan.name,
                }
                : null,
        })),
        summary: {
            ownedWorkspaceCount: ownedWorkspaces.length,
            workspaceArchiveCount: ownedWorkspaces.filter(
                (workspace) => workspace.willBeArchived,
            ).length,
            otherActiveMemberCount: ownedWorkspaces.reduce(
                (total, workspace) => (
                    total + workspace.otherActiveMemberCount
                ),
                0,
            ),
            membershipRemovalCount: memberships.length,
            affectedSubscriptionCount: affectedSubscriptions.length,
        },
    };
};

export {
    CLOSURE_IMPACT_MEMBERSHIP_STATUSES,
    CLOSURE_IMPACT_SUBSCRIPTION_STATUSES,
    getCurrentUserClosureImpact,
};
