import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AUDIT_ACTION } from '../../constants/auditActions.constants.js';
import {
    closeWorkspaceByOwner,
    closeWorkspaceByPlatform,
} from '../../modules/workspace/workspaceClosure.service.js';
import { Workspace } from '../../modules/workspace/workspace.model.js';
import {
    WorkspaceMember,
} from '../../modules/workspaceMember/workspaceMember.model.js';
import { Subscription } from '../../modules/subscriptions/subscription.model.js';
import {
    confirmCurrentUserPassword,
} from '../../modules/auth/services/confirmCurrentUserPassword.service.js';
import {
    createAuditLog,
} from '../../modules/auditLog/auditLog.service.js';

vi.mock('../../modules/workspace/workspace.model.js', () => ({
    Workspace: {
        findById: vi.fn(),
        findOneAndUpdate: vi.fn(),
    },
}));

vi.mock('../../modules/workspaceMember/workspaceMember.model.js', () => ({
    WorkspaceMember: {
        findOne: vi.fn(),
    },
}));

vi.mock('../../modules/subscriptions/subscription.model.js', () => ({
    Subscription: {
        find: vi.fn(),
        findOneAndUpdate: vi.fn(),
    },
}));

vi.mock('../../modules/auth/services/confirmCurrentUserPassword.service.js', () => ({
    confirmCurrentUserPassword: vi.fn(),
}));

vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: vi.fn(),
}));

const sessionQuery = (value) => ({
    session: vi.fn().mockResolvedValue(value),
});

const ownerMembershipQuery = (value) => {
    const query = {
        populate: vi.fn(),
        session: vi.fn().mockResolvedValue(value),
    };
    query.populate.mockReturnValue(query);
    return query;
};

describe('workspaceClosure.service', () => {
    const session = { id: 'mongo-session' };

    beforeEach(() => {
        vi.clearAllMocks();
        confirmCurrentUserPassword.mockResolvedValue(undefined);
        createAuditLog.mockResolvedValue(undefined);
        vi.spyOn(mongoose.connection, 'transaction').mockImplementation(
            async (callback) => callback(session),
        );
    });

    it('ferme atomiquement un workspace owner et annule ses subscriptions courantes', async () => {
        WorkspaceMember.findOne.mockReturnValue(ownerMembershipQuery({
            _id: 'owner-member-id',
            role: {
                _id: 'owner-role-id',
                key: 'owner',
                isSystem: true,
                workspace: 'workspace-id',
            },
        }));

        const workspace = {
            _id: 'workspace-id',
            name: 'Acme',
            status: 'active',
        };
        Workspace.findById.mockReturnValue(sessionQuery(workspace));
        Workspace.findOneAndUpdate.mockResolvedValue({
            _id: { toString: () => 'workspace-id' },
            status: 'closed',
            statusReason: 'owner_request',
            statusReasonDetails: null,
            statusChangedAt: new Date('2026-09-05T12:00:00.000Z'),
        });

        const subscription = {
            _id: 'subscription-id',
            status: 'active',
        };
        Subscription.find.mockReturnValue(sessionQuery([subscription]));
        Subscription.findOneAndUpdate.mockResolvedValue({
            _id: 'subscription-id',
            status: 'canceled',
        });

        const result = await closeWorkspaceByOwner({
            workspaceId: 'workspace-id',
            actorId: 'user-id',
            currentPassword: 'Correct Horse Battery Staple',
            confirmationName: 'Acme',
            ipAddress: '127.0.0.1',
            userAgent: 'Test Browser',
        });

        expect(confirmCurrentUserPassword).toHaveBeenCalledWith({
            userId: 'user-id',
            password: 'Correct Horse Battery Staple',
        });
        expect(Workspace.findOneAndUpdate).toHaveBeenCalledWith(
            { _id: 'workspace-id', status: 'active' },
            expect.objectContaining({
                $set: expect.objectContaining({
                    status: 'closed',
                    statusReason: 'owner_request',
                    statusChangedBy: 'user-id',
                }),
            }),
            expect.objectContaining({
                returnDocument: 'after',
                runValidators: true,
                session,
            }),
        );
        expect(Subscription.findOneAndUpdate).toHaveBeenCalledWith(
            { _id: 'subscription-id', status: 'active' },
            {
                $set: {
                    status: 'canceled',
                    cancelAtPeriodEnd: false,
                    scheduledChange: null,
                    updatedBy: 'user-id',
                },
            },
            expect.objectContaining({ session }),
        );
        expect(createAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                action: AUDIT_ACTION.WORKSPACE_CLOSED,
                metadata: expect.objectContaining({
                    previousStatus: 'active',
                    statusReason: 'owner_request',
                    canceledSubscriptionCount: 1,
                }),
            }),
            { session },
        );
        expect(result).toMatchObject({
            id: 'workspace-id',
            status: 'closed',
            statusReason: 'owner_request',
            canceledSubscriptionCount: 1,
        });
    });

    it('refuse une confirmation de nom incorrecte sans fermer le workspace', async () => {
        WorkspaceMember.findOne.mockReturnValue(ownerMembershipQuery({
            _id: 'owner-member-id',
            role: {
                key: 'owner',
                isSystem: true,
            },
        }));
        Workspace.findById.mockReturnValue(sessionQuery({
            _id: 'workspace-id',
            name: 'Acme',
            status: 'active',
        }));

        await expect(
            closeWorkspaceByOwner({
                workspaceId: 'workspace-id',
                actorId: 'user-id',
                currentPassword: 'Correct Horse Battery Staple',
                confirmationName: 'Autre nom',
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
            message: expect.stringContaining('confirmation'),
        });

        expect(Workspace.findOneAndUpdate).not.toHaveBeenCalled();
        expect(Subscription.find).not.toHaveBeenCalled();
    });

    it('permet à Platform de fermer un workspace suspendu', async () => {
        Workspace.findById.mockReturnValue(sessionQuery({
            _id: 'workspace-id',
            name: 'Acme',
            status: 'suspended',
        }));
        Workspace.findOneAndUpdate.mockResolvedValue({
            _id: { toString: () => 'workspace-id' },
            status: 'closed',
            statusReason: 'platform_decision',
            statusReasonDetails: 'Clôture administrative',
            statusChangedAt: new Date('2026-09-05T12:00:00.000Z'),
        });
        Subscription.find.mockReturnValue(sessionQuery([]));

        const result = await closeWorkspaceByPlatform({
            workspaceId: 'workspace-id',
            actorId: 'admin-id',
            statusReason: 'platform_decision',
            statusReasonDetails: 'Clôture administrative',
        });

        expect(result).toMatchObject({
            id: 'workspace-id',
            status: 'closed',
            statusReason: 'platform_decision',
            canceledSubscriptionCount: 0,
        });
    });
});
