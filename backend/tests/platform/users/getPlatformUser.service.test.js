import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { User } from '../../../modules/users/user.model.js';

import {
    getPlatformUser,
} from '../../../modules/platform/users/services/getPlatformUser.service.js';


vi.mock(
    '../../../modules/users/user.model.js',
    () => ({
        User: {
            findById: vi.fn(),
        },
    }),
);


describe('getPlatformUser', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('retourne le détail administratif de l’utilisateur', async () => {
        const userDocument = {
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
            passwordChangedAt: new Date(
                '2026-08-10T10:00:00.000Z',
            ),
            lastLoginAt: new Date(
                '2026-08-20T08:00:00.000Z',
            ),
            disabledAt: null,
            disabledReason: null,
            deletionRequestedAt: null,
            closedAt: null,
            closureReason: null,
            createdAt: new Date(
                '2026-07-01T09:00:00.000Z',
            ),
            updatedAt: new Date(
                '2026-08-20T08:00:00.000Z',
            ),
        };

        const query = {
            select: vi.fn().mockReturnThis(),
            lean: vi.fn().mockResolvedValue(
                userDocument,
            ),
        };

        User.findById.mockReturnValue(query);

        const result = await getPlatformUser({
            userId: '507f1f77bcf86cd799439011',
        });

        expect(result).toEqual({
            id: 'user-1',
            firstName: 'Alice',
            lastName: 'Martin',
            email: 'alice@example.com',
            status: 'active',
            platformRole: 'user',
            emailVerifiedAt:
                userDocument.emailVerifiedAt,
            passwordChangedAt:
                userDocument.passwordChangedAt,
            lastLoginAt:
                userDocument.lastLoginAt,
            disabledAt: null,
            disabledReason: null,
            deletionRequestedAt: null,
            closedAt: null,
            closureReason: null,
            createdAt:
                userDocument.createdAt,
            updatedAt:
                userDocument.updatedAt,
        });

        expect(User.findById).toHaveBeenCalledWith(
            '507f1f77bcf86cd799439011',
        );
    });

    it('retourne null lorsque l’utilisateur est introuvable', async () => {
        const query = {
            select: vi.fn().mockReturnThis(),
            lean: vi.fn().mockResolvedValue(null),
        };

        User.findById.mockReturnValue(query);

        const result = await getPlatformUser({
            userId: '507f1f77bcf86cd799439011',
        });

        expect(result).toBeNull();
    });

    it('refuse l’absence de userId', async () => {
        await expect(
            getPlatformUser({
                userId: null,
            }),
        ).rejects.toThrow(
            'userId is required to get a platform user',
        );

        expect(User.findById).not.toHaveBeenCalled();
    });
});