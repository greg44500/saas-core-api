import mongoose from 'mongoose';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../constants/auditActions.constants.js';

import {
    USER_STATUS,
} from '../../../constants/userStatus.constants.js';

import {
    createAuditLog,
} from '../../../modules/auditLog/auditLog.service.js';

import {
    enablePlatformUser,
} from '../../../modules/platform/users/services/enablePlatformUser.service.js';

import { User } from '../../../modules/users/user.model.js';


vi.mock(
    '../../../modules/users/user.model.js',
    () => ({
        User: {
            findOneAndUpdate: vi.fn(),
            findById: vi.fn(),
        },
    }),
);

vi.mock(
    '../../../modules/auditLog/auditLog.service.js',
    () => ({
        createAuditLog: vi.fn(),
    }),
);


describe('enablePlatformUser', () => {
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

    it('réactive l’utilisateur et audite la mutation', async () => {
        const enabledUser = {
            _id: {
                toString: () => 'target-user-id',
            },
            status: USER_STATUS.ACTIVE,
        };

        User.findOneAndUpdate.mockResolvedValue(
            enabledUser,
        );

        createAuditLog.mockResolvedValue({});

        const result = await enablePlatformUser({
            userId: 'target-user-id',
            actorId: 'admin-user-id',
            ipAddress: '127.0.0.1',
            userAgent: 'Vitest',
        });

        expect(
            User.findOneAndUpdate,
        ).toHaveBeenCalledWith(
            {
                _id: 'target-user-id',
                status: USER_STATUS.DISABLED,
            },
            {
                $set: {
                    status: USER_STATUS.ACTIVE,
                    disabledAt: null,
                    disabledBy: null,
                    disabledReason: null,
                    updatedBy: 'admin-user-id',
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );

        expect(
            createAuditLog,
        ).toHaveBeenCalledWith(
            {
                actor: 'admin-user-id',
                action:
                    AUDIT_ACTION.USER_ENABLED,
                entityType:
                    AUDIT_ENTITY_TYPE.USER,
                entityId: enabledUser._id,
                status:
                    AUDIT_STATUS.SUCCESS,
                ipAddress: '127.0.0.1',
                userAgent: 'Vitest',
                metadata: {
                    enabledAt: expect.any(Date),
                },
            },
            {
                session,
            },
        );

        expect(result).toEqual({
            id: 'target-user-id',
            status: USER_STATUS.ACTIVE,
        });
    });

    it('retourne 404 lorsque l’utilisateur ciblé n’existe pas', async () => {
        User.findOneAndUpdate.mockResolvedValue(
            null,
        );

        const findByIdQuery = {
            session: vi.fn().mockResolvedValue(
                null,
            ),
        };

        User.findById.mockReturnValue(
            findByIdQuery,
        );

        await expect(
            enablePlatformUser({
                userId: 'missing-user-id',
                actorId: 'admin-user-id',
            }),
        ).rejects.toMatchObject({
            statusCode: 404,
        });

        expect(
            createAuditLog,
        ).not.toHaveBeenCalled();
    });

    it('refuse la réactivation lorsque le compte n’est pas désactivé', async () => {
        User.findOneAndUpdate.mockResolvedValue(
            null,
        );

        const findByIdQuery = {
            session: vi.fn().mockResolvedValue({
                _id: 'target-user-id',
                status: USER_STATUS.ACTIVE,
            }),
        };

        User.findById.mockReturnValue(
            findByIdQuery,
        );

        await expect(
            enablePlatformUser({
                userId: 'target-user-id',
                actorId: 'admin-user-id',
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(
            createAuditLog,
        ).not.toHaveBeenCalled();
    });

    it('refuse les paramètres obligatoires manquants', async () => {
        await expect(
            enablePlatformUser({
                userId: null,
                actorId: 'admin-user-id',
            }),
        ).rejects.toThrow(
            'userId and actorId are required to enable a platform user',
        );

        expect(
            mongoose.connection.transaction,
        ).not.toHaveBeenCalled();

        expect(
            User.findOneAndUpdate,
        ).not.toHaveBeenCalled();
    });
});