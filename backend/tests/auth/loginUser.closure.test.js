import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import { AUTH_PROVIDER } from '../../constants/authProvider.constants.js';
import {
    createAuditLog,
} from '../../modules/auditLog/auditLog.service.js';
import {
    loginUser,
} from '../../modules/auth/services/loginUser.service.js';
import {
    AuthIdentity,
} from '../../modules/authIdentities/authIdentity.model.js';
import {
    createInitialAuthSession,
} from '../../modules/authSessions/authSession.service.js';
import { User } from '../../modules/users/user.model.js';
import { verifyPassword } from '../../utils/password.js';

vi.mock('../../modules/users/user.model.js', () => ({
    User: {
        findOne: vi.fn(),
    },
}));

vi.mock('../../modules/authIdentities/authIdentity.model.js', () => ({
    AuthIdentity: {
        findOne: vi.fn(),
    },
}));

vi.mock('../../modules/authSessions/authSession.service.js', () => ({
    createInitialAuthSession: vi.fn(),
}));

vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: vi.fn(),
}));

vi.mock('../../utils/password.js', () => ({
    verifyPassword: vi.fn(),
}));

describe('loginUser — fermeture de compte', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        createAuditLog.mockResolvedValue(undefined);
        AuthIdentity.findOne.mockReturnValue({
            select: vi.fn().mockResolvedValue({
                passwordHash: 'stored-password-hash',
            }),
        });
        verifyPassword.mockResolvedValue(true);
    });

    it.each([
        [
            'deletion_requested',
            'Fermeture du compte en cours',
            'account_deletion_requested',
        ],
        [
            'closed',
            'Compte clôturé',
            'account_closed',
        ],
    ])(
        'refuse un nouveau login lorsque le compte est %s',
        async (status, message, reasonCode) => {
            User.findOne.mockResolvedValue({
                _id: 'user-id',
                status,
            });

            await expect(
                loginUser({
                    email: 'greg@example.com',
                    password: 'Correct Horse Battery Staple',
                    ipAddress: '127.0.0.1',
                    userAgent: 'Test Browser',
                }),
            ).rejects.toMatchObject({
                statusCode: 403,
                message,
            });

            expect(createInitialAuthSession).not.toHaveBeenCalled();
            expect(createAuditLog).toHaveBeenCalledWith({
                actor: null,
                action: AUDIT_ACTION.LOGIN_FAILED,
                entityType: AUDIT_ENTITY_TYPE.USER,
                entityId: 'user-id',
                status: AUDIT_STATUS.FAILED,
                ipAddress: '127.0.0.1',
                userAgent: 'Test Browser',
                metadata: {
                    provider: AUTH_PROVIDER.LOCAL,
                    reasonCode,
                },
            });
        },
    );
});
