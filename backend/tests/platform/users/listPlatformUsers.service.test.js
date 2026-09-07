import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { WORKSPACE_MEMBER_STATUS } from '../../../constants/workspaceMember.constants.js';
import { User } from '../../../modules/users/user.model.js';
import { WorkspaceMember } from '../../../modules/workspaceMember/workspaceMember.model.js';

import {
    CURRENT_CLIENT_MEMBERSHIP_STATUSES,
    listPlatformUsers,
} from '../../../modules/platform/users/services/listPlatformUsers.service.js';


vi.mock(
    '../../../modules/users/user.model.js',
    () => ({
        User: {
            aggregate: vi.fn(),
        },
    }),
);

vi.mock(
    '../../../modules/workspaceMember/workspaceMember.model.js',
    () => ({
        WorkspaceMember: {
            collection: {
                name: 'workspacemembers',
            },
        },
    }),
);


describe('listPlatformUsers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('retourne uniquement la projection client paginée sans rôle Platform legacy', async () => {
        const userDocument = {
            _id: {
                toString: () => 'user-1',
            },
            firstName: 'Alice',
            lastName: 'Martin',
            email: 'alice@example.com',
            status: 'active',
            emailVerifiedAt: new Date(
                '2026-08-01T10:00:00.000Z',
            ),
            lastLoginAt: new Date(
                '2026-08-20T08:00:00.000Z',
            ),
            createdAt: new Date(
                '2026-07-01T09:00:00.000Z',
            ),
            updatedAt: new Date(
                '2026-08-20T08:00:00.000Z',
            ),
        };

        User.aggregate.mockResolvedValue([
            {
                users: [userDocument],
                total: [{ value: 1 }],
            },
        ]);

        const result = await listPlatformUsers({
            page: 1,
            limit: 20,
        });

        expect(result).toEqual({
            users: [
                {
                    id: 'user-1',
                    firstName: 'Alice',
                    lastName: 'Martin',
                    email: 'alice@example.com',
                    status: 'active',
                    emailVerifiedAt:
                        userDocument.emailVerifiedAt,
                    lastLoginAt:
                        userDocument.lastLoginAt,
                    createdAt:
                        userDocument.createdAt,
                    updatedAt:
                        userDocument.updatedAt,
                },
            ],
            pagination: {
                page: 1,
                limit: 20,
                total: 1,
                totalPages: 1,
            },
        });

        expect(result.users[0]).not.toHaveProperty('platformRole');
    });

    it('filtre en base les utilisateurs sans appartenance Workspace courante avant pagination', async () => {
        User.aggregate.mockResolvedValue([
            {
                users: [],
                total: [],
            },
        ]);

        await listPlatformUsers({
            page: 3,
            limit: 10,
        });

        expect(User.aggregate).toHaveBeenCalledOnce();

        const pipeline = User.aggregate.mock.calls[0][0];
        const lookupStage = pipeline.find((stage) => stage.$lookup)?.$lookup;
        const membershipMatch = lookupStage.pipeline.find(
            (stage) => stage.$match,
        ).$match;
        const currentMembershipStage = pipeline.find(
            (stage) => stage.$match?.['currentWorkspaceMemberships.0'],
        );
        const facetStage = pipeline.find((stage) => stage.$facet)?.$facet;

        expect(lookupStage.from).toBe(
            WorkspaceMember.collection.name,
        );
        expect(membershipMatch).toEqual({
            status: {
                $in: [
                    WORKSPACE_MEMBER_STATUS.ACTIVE,
                    WORKSPACE_MEMBER_STATUS.SUSPENDED,
                ],
            },
        });
        expect(currentMembershipStage).toEqual({
            $match: {
                'currentWorkspaceMemberships.0': {
                    $exists: true,
                },
            },
        });
        expect(facetStage.users).toContainEqual({
            $skip: 20,
        });
        expect(facetStage.users).toContainEqual({
            $limit: 10,
        });
    });

    it('considère active et suspended comme relations client courantes, jamais removed', () => {
        expect(CURRENT_CLIENT_MEMBERSHIP_STATUSES).toEqual([
            WORKSPACE_MEMBER_STATUS.ACTIVE,
            WORKSPACE_MEMBER_STATUS.SUSPENDED,
        ]);
        expect(CURRENT_CLIENT_MEMBERSHIP_STATUSES).not.toContain(
            WORKSPACE_MEMBER_STATUS.REMOVED,
        );
    });

    it('calcule correctement une pagination vide', async () => {
        User.aggregate.mockResolvedValue([
            {
                users: [],
                total: [],
            },
        ]);

        const result = await listPlatformUsers({
            page: 2,
            limit: 10,
        });

        expect(result).toEqual({
            users: [],
            pagination: {
                page: 2,
                limit: 10,
                total: 0,
                totalPages: 0,
            },
        });
    });

    it('refuse une pagination invalide', async () => {
        await expect(
            listPlatformUsers({
                page: 0,
                limit: 20,
            }),
        ).rejects.toThrow(
            'page must be an integer greater than or equal to 1',
        );

        await expect(
            listPlatformUsers({
                page: 1,
                limit: 101,
            }),
        ).rejects.toThrow(
            'limit must be an integer between 1 and 100',
        );

        expect(User.aggregate).not.toHaveBeenCalled();
    });
});
