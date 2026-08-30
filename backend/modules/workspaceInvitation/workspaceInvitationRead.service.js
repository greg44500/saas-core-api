import mongoose from 'mongoose';

import {
    WORKSPACE_INVITATION_STATUS,
} from '../../constants/workspaceInvitation.constants.js';
import { Role } from '../role/role.model.js';
import {
    expirePendingWorkspaceInvitations,
} from './workspaceInvitation.service.js';
import { WorkspaceInvitation } from './workspaceInvitation.model.js';

const listWorkspaceInvitations = async ({
    workspaceId,
    page = 1,
    limit = 20,
    now = new Date(),
}) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to list workspace invitations',
        );
    }

    await expirePendingWorkspaceInvitations({
        workspaceId,
        now,
    });

    const workspaceObjectId = new mongoose.Types.ObjectId(
        workspaceId.toString(),
    );
    const skip = (page - 1) * limit;

    const [result] = await WorkspaceInvitation.aggregate([
        {
            $match: {
                workspace: workspaceObjectId,
                status: WORKSPACE_INVITATION_STATUS.PENDING,
            },
        },
        {
            $lookup: {
                from: Role.collection.name,
                localField: 'role',
                foreignField: '_id',
                pipeline: [
                    { $match: { workspace: workspaceObjectId } },
                    { $project: { _id: 1, key: 1, name: 1 } },
                ],
                as: 'role',
            },
        },
        { $unwind: '$role' },
        {
            $facet: {
                invitations: [
                    { $sort: { createdAt: -1, _id: -1 } },
                    { $skip: skip },
                    { $limit: limit },
                    {
                        $project: {
                            _id: 0,
                            id: { $toString: '$_id' },
                            email: '$emailCanonical',
                            status: 1,
                            deliveryStatus: 1,
                            lastDeliveryAttemptAt: 1,
                            deliveredAt: 1,
                            expiresAt: 1,
                            createdAt: 1,
                            role: {
                                id: { $toString: '$role._id' },
                                key: '$role.key',
                                name: '$role.name',
                            },
                        },
                    },
                ],
                metadata: [{ $count: 'total' }],
            },
        },
    ]).exec();

    const invitations = result?.invitations ?? [];
    const total = result?.metadata?.[0]?.total ?? 0;

    return {
        invitations,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

export { listWorkspaceInvitations };
