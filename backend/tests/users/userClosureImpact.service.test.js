import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Subscription } from '../../modules/subscriptions/subscription.model.js';
import {
    getCurrentUserClosureImpact,
} from '../../modules/users/userClosureImpact.service.js';
import { User } from '../../modules/users/user.model.js';
import {
    WorkspaceMember,
} from '../../modules/workspaceMember/workspaceMember.model.js';

vi.mock('../../modules/subscriptions/subscription.model.js', () => ({
    Subscription: {
        find: vi.fn(),
    },
}));

vi.mock('../../modules/users/user.model.js', () => ({
    User: {
        findOne: vi.fn(),
    },
}));

vi.mock('../../modules/workspaceMember/workspaceMember.model.js', () => ({
    WorkspaceMember: {
        find: vi.fn(),
    },
}));

const selectQuery = (value) => ({
    select: vi.fn().mockResolvedValue(value),
});

const membershipPopulateQuery = (memberships) => {
    const query = {
        populate: vi.fn(),
    };

    query.populate
        .mockReturnValueOnce(query)
        .mockResolvedValueOnce(memberships);

    return query;
};

const subscriptionPopulateQuery = (subscriptions) => {
    const query = {
        select: vi.fn(),
        populate: vi.fn().mockResolvedValue(subscriptions),
    };

    query.select.mockReturnValue(query);

    return query;
};

const objectId = (value) => ({
    toString: () => value,
});

const createMembership = ({
    id,
    workspaceId,
    workspaceName,
    workspaceStatus = 'active',
    roleKey = 'member',
    membershipStatus = 'active',
}) => ({
    _id: id,
    status: membershipStatus,
    role: {
        key: roleKey,
        isSystem: true,
        workspace: objectId(workspaceId),
    },
    workspace: {
        _id: objectId(workspaceId),
        name: workspaceName,
        status: workspaceStatus,
    },
});

describe('getCurrentUserClosureImpact', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        User.findOne.mockReturnValue(selectQuery({
            _id: objectId('user-id'),
            status: 'active',
        }));
    });

    it('décrit les Workspaces possédés, les memberships retirées et les subscriptions commerciales affectées', async () => {
        const ownerActive = createMembership({
            id: 'owner-a',
            workspaceId: 'workspace-a',
            workspaceName: 'Restaurant ACME',
            roleKey: 'owner',
        });
        const ownerArchived = createMembership({
            id: 'owner-b',
            workspaceId: 'workspace-b',
            workspaceName: 'Ancien projet',
            workspaceStatus: 'archived',
            roleKey: 'owner',
        });
        const memberOnly = createMembership({
            id: 'member-c',
            workspaceId: 'workspace-c',
            workspaceName: 'Projet Formation',
            roleKey: 'member',
            membershipStatus: 'suspended',
        });

        WorkspaceMember.find
            .mockReturnValueOnce(membershipPopulateQuery([
                ownerActive,
                ownerArchived,
                memberOnly,
            ]))
            .mockReturnValueOnce(selectQuery([
                { workspace: objectId('workspace-a') },
                { workspace: objectId('workspace-a') },
                { workspace: objectId('workspace-b') },
            ]));

        Subscription.find.mockReturnValue(subscriptionPopulateQuery([
            {
                _id: objectId('subscription-id'),
                workspace: objectId('workspace-a'),
                kind: 'commercial',
                status: 'active',
                plan: {
                    _id: objectId('plan-id'),
                    name: 'Premium',
                },
            },
        ]));

        const result = await getCurrentUserClosureImpact({
            userId: 'user-id',
        });

        expect(result.ownedWorkspaces).toEqual([
            {
                id: 'workspace-a',
                name: 'Restaurant ACME',
                currentStatus: 'active',
                willBeArchived: true,
                otherActiveMemberCount: 2,
            },
            {
                id: 'workspace-b',
                name: 'Ancien projet',
                currentStatus: 'archived',
                willBeArchived: false,
                otherActiveMemberCount: 1,
            },
        ]);
        expect(result.workspacesToArchive).toEqual([
            expect.objectContaining({
                id: 'workspace-a',
                willBeArchived: true,
            }),
        ]);
        expect(result.memberOnlyWorkspaces).toEqual([
            {
                id: 'workspace-c',
                name: 'Projet Formation',
                currentStatus: 'active',
                membershipStatus: 'suspended',
                membershipWillBeRemoved: true,
            },
        ]);
        expect(result.affectedSubscriptions).toEqual([
            {
                id: 'subscription-id',
                workspaceId: 'workspace-a',
                kind: 'commercial',
                status: 'active',
                plan: {
                    id: 'plan-id',
                    name: 'Premium',
                },
            },
        ]);
        expect(result.summary).toEqual({
            ownedWorkspaceCount: 2,
            workspaceArchiveCount: 1,
            otherActiveMemberCount: 3,
            membershipRemovalCount: 3,
            affectedSubscriptionCount: 1,
        });
        expect(Subscription.find).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: 'commercial',
            }),
        );
    });

    it('retourne un impact vide pour un User sans membership', async () => {
        WorkspaceMember.find.mockReturnValueOnce(
            membershipPopulateQuery([]),
        );

        const result = await getCurrentUserClosureImpact({
            userId: 'user-id',
        });

        expect(result).toEqual({
            ownedWorkspaces: [],
            workspacesToArchive: [],
            memberOnlyWorkspaces: [],
            affectedSubscriptions: [],
            summary: {
                ownedWorkspaceCount: 0,
                workspaceArchiveCount: 0,
                otherActiveMemberCount: 0,
                membershipRemovalCount: 0,
                affectedSubscriptionCount: 0,
            },
        });
        expect(WorkspaceMember.find).toHaveBeenCalledTimes(1);
        expect(Subscription.find).not.toHaveBeenCalled();
    });

    it('refuse l’aperçu pour un compte qui n’est plus actif', async () => {
        User.findOne.mockReturnValue(selectQuery(null));

        await expect(
            getCurrentUserClosureImpact({ userId: 'user-id' }),
        ).rejects.toMatchObject({
            statusCode: 403,
            message: 'Compte indisponible',
        });

        expect(WorkspaceMember.find).not.toHaveBeenCalled();
        expect(Subscription.find).not.toHaveBeenCalled();
    });

    it('échoue en sécurité si une membership référence un rôle incohérent', async () => {
        WorkspaceMember.find.mockReturnValueOnce(
            membershipPopulateQuery([
                {
                    _id: 'member-id',
                    status: 'active',
                    role: null,
                    workspace: {
                        _id: objectId('workspace-id'),
                        name: 'Workspace',
                        status: 'active',
                    },
                },
            ]),
        );

        await expect(
            getCurrentUserClosureImpact({ userId: 'user-id' }),
        ).rejects.toMatchObject({
            statusCode: 409,
            message: expect.stringContaining('incohérente'),
        });

        expect(Subscription.find).not.toHaveBeenCalled();
    });
});
