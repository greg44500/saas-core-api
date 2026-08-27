import mongoose from 'mongoose';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    AUTH_SESSION_REVOKED_REASON,
} from '../../../constants/authSession.constants.js';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../constants/auditActions.constants.js';

import {
    PLATFORM_ROLE,
} from '../../../constants/platformRoles.constants.js';

import {
    revokeAllUserAuthSessions,
} from '../../../modules/authSessions/authSession.service.js';

import {
    createAuditLog,
} from '../../../modules/auditLog/auditLog.service.js';

import {
    updatePlatformUserRole,
} from '../../../modules/platform/services/updatePlatformUserRole.service.js';

import { User } from '../../../modules/users/user.model.js';


vi.mock(
    '../../../modules/users/user.model.js',
    () => ({
        User: {
            findById: vi.fn(),
            countDocuments: vi.fn(),
            findOneAndUpdate: vi.fn(),
        },
    }),
);

vi.mock(
    '../../../modules/authSessions/authSession.service.js',
    () => ({
        revokeAllUserAuthSessions: vi.fn(),
    }),
);

vi.mock(
    '../../../modules/auditLog/auditLog.service.js',
    () => ({
        createAuditLog: vi.fn(),
    }),
);


describe('updatePlatformUserRole', () => {
    const session = {
        id: 'session-1',
    };

    beforeEach(() => {
        vi.clearAllMocks();

        vi.spyOn(
            mongoose.connection,
            'transaction',
        ).mockImplementation(
            async (callback) => callback(session),
        );
    });

    it('modifie le rôle, révoque les sessions et audite la mutation', async () => {
        const currentUser = {
            _id: {
                toString: () => 'target-user-id',
            },
            platformRole: PLATFORM_ROLE.USER,
        };

        const updatedUser = {
            _id: currentUser._id,
            platformRole: PLATFORM_ROLE.ADMIN,
        };

        User.findById.mockReturnValue({
            session: vi.fn().mockResolvedValue(
                currentUser,
            ),
        });

        User.findOneAndUpdate.mockResolvedValue(
            updatedUser,
        );

        revokeAllUserAuthSessions.mockResolvedValue({
            modifiedCount: 2,
        });

        createAuditLog.mockResolvedValue({});

        const result = await updatePlatformUserRole({
            userId: 'target-user-id',
            actorId: 'super-admin-id',
            platformRole: PLATFORM_ROLE.ADMIN,
            ipAddress: '127.0.0.1',
            userAgent: 'Vitest',
        });

        expect(
            User.findOneAndUpdate,
        ).toHaveBeenCalledWith(
            {
                _id: 'target-user-id',
                platformRole:
                    PLATFORM_ROLE.USER,
            },
            {
                $set: {
                    platformRole:
                        PLATFORM_ROLE.ADMIN,
                    updatedBy:
                        'super-admin-id',
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );

        expect(
            revokeAllUserAuthSessions,
        ).toHaveBeenCalledWith({
            userId: updatedUser._id,
            revokedReason:
                AUTH_SESSION_REVOKED_REASON
                    .ADMIN_REVOKED,
            session,
        });

        expect(
            createAuditLog,
        ).toHaveBeenCalledWith(
            {
                actor: 'super-admin-id',
                action:
                    AUDIT_ACTION
                        .USER_PLATFORM_ROLE_UPDATED,
                entityType:
                    AUDIT_ENTITY_TYPE.USER,
                entityId: updatedUser._id,
                status:
                    AUDIT_STATUS.SUCCESS,
                ipAddress: '127.0.0.1',
                userAgent: 'Vitest',
                metadata: {
                    previousPlatformRole:
                        PLATFORM_ROLE.USER,
                    newPlatformRole:
                        PLATFORM_ROLE.ADMIN,
                    revokedSessionCount: 2,
                },
            },
            {
                session,
            },
        );

        expect(result).toEqual({
            id: 'target-user-id',
            platformRole:
                PLATFORM_ROLE.ADMIN,
        });
    });

    it('refuse la rétrogradation du dernier super-admin', async () => {
        const currentUser = {
            _id: {
                toString: () => 'target-user-id',
            },
            platformRole:
                PLATFORM_ROLE.SUPER_ADMIN,
        };

        User.findById.mockReturnValue({
            session: vi.fn().mockResolvedValue(
                currentUser,
            ),
        });

        User.countDocuments.mockReturnValue({
            session: vi.fn().mockResolvedValue(1),
        });

        await expect(
            updatePlatformUserRole({
                userId: 'target-user-id',
                actorId: 'another-super-admin-id',
                platformRole:
                    PLATFORM_ROLE.ADMIN,
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(
            User.findOneAndUpdate,
        ).not.toHaveBeenCalled();

        expect(
            revokeAllUserAuthSessions,
        ).not.toHaveBeenCalled();
    });

    it('refuse l’auto-rétrogradation du super-admin', async () => {
        const currentUser = {
            _id: {
                toString: () => 'same-user-id',
            },
            platformRole:
                PLATFORM_ROLE.SUPER_ADMIN,
        };

        User.findById.mockReturnValue({
            session: vi.fn().mockResolvedValue(
                currentUser,
            ),
        });

        await expect(
            updatePlatformUserRole({
                userId: 'same-user-id',
                actorId: 'same-user-id',
                platformRole:
                    PLATFORM_ROLE.ADMIN,
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(
            User.countDocuments,
        ).not.toHaveBeenCalled();

        expect(
            User.findOneAndUpdate,
        ).not.toHaveBeenCalled();
    });

    it('refuse une modification vers le rôle déjà attribué', async () => {
        const currentUser = {
            _id: {
                toString: () => 'target-user-id',
            },
            platformRole:
                PLATFORM_ROLE.ADMIN,
        };

        User.findById.mockReturnValue({
            session: vi.fn().mockResolvedValue(
                currentUser,
            ),
        });

        await expect(
            updatePlatformUserRole({
                userId: 'target-user-id',
                actorId: 'super-admin-id',
                platformRole:
                    PLATFORM_ROLE.ADMIN,
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(
            User.findOneAndUpdate,
        ).not.toHaveBeenCalled();
    });

    it('retourne 404 lorsque l’utilisateur ciblé n’existe pas', async () => {
        User.findById.mockReturnValue({
            session: vi.fn().mockResolvedValue(
                null,
            ),
        });

        await expect(
            updatePlatformUserRole({
                userId: 'missing-user-id',
                actorId: 'super-admin-id',
                platformRole:
                    PLATFORM_ROLE.ADMIN,
            }),
        ).rejects.toMatchObject({
            statusCode: 404,
        });

        expect(
            User.findOneAndUpdate,
        ).not.toHaveBeenCalled();
    });
});