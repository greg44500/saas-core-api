import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { User } from '../../../modules/users/user.model.js';

import {
    listPlatformUsers,
} from '../../../modules/platform/users/services/listPlatformUsers.service.js';


vi.mock(
    '../../../modules/users/user.model.js',
    () => ({
        User: {
            find: vi.fn(),
            countDocuments: vi.fn(),
        },
    }),
);


describe('listPlatformUsers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('retourne les utilisateurs transformés avec leur pagination', async () => {
        const userDocuments = [
            {
                _id: {
                    toString: () => 'user-1',
                },
                firstName: 'Alice',
                lastName: 'Martin',
                email: 'alice@example.com',
                status: 'active',
                platformRole: 'user',
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
            },
        ];

        const query = {
            select: vi.fn().mockReturnThis(),
            sort: vi.fn().mockReturnThis(),
            skip: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            lean: vi.fn().mockResolvedValue(
                userDocuments,
            ),
        };

        User.find.mockReturnValue(query);
        User.countDocuments.mockResolvedValue(1);

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
                    platformRole: 'user',
                    emailVerifiedAt:
                        userDocuments[0].emailVerifiedAt,
                    lastLoginAt:
                        userDocuments[0].lastLoginAt,
                    createdAt:
                        userDocuments[0].createdAt,
                    updatedAt:
                        userDocuments[0].updatedAt,
                },
            ],
            pagination: {
                page: 1,
                limit: 20,
                total: 1,
                totalPages: 1,
            },
        });

        expect(query.skip).toHaveBeenCalledWith(0);
        expect(query.limit).toHaveBeenCalledWith(20);

        expect(
            User.countDocuments,
        ).toHaveBeenCalledWith({});
    });

    it('applique correctement la pagination demandée', async () => {
        const query = {
            select: vi.fn().mockReturnThis(),
            sort: vi.fn().mockReturnThis(),
            skip: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            lean: vi.fn().mockResolvedValue([]),
        };

        User.find.mockReturnValue(query);
        User.countDocuments.mockResolvedValue(45);

        const result = await listPlatformUsers({
            page: 3,
            limit: 10,
        });

        expect(query.skip).toHaveBeenCalledWith(20);
        expect(query.limit).toHaveBeenCalledWith(10);

        expect(result.pagination).toEqual({
            page: 3,
            limit: 10,
            total: 45,
            totalPages: 5,
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

        expect(User.find).not.toHaveBeenCalled();
        expect(
            User.countDocuments,
        ).not.toHaveBeenCalled();
    });
});