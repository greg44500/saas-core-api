import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthSession } from '../../modules/authSessions/authSession.model.js';
import {
    rotateAuthSession,
} from '../../modules/authSessions/authSession.service.js';
import { User } from '../../modules/users/user.model.js';

vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: vi.fn(),
}));

vi.mock('../../modules/authSessions/authSession.model.js', () => ({
    AuthSession: {
        findOne: vi.fn(),
        findOneAndUpdate: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
    },
}));

vi.mock('../../modules/users/user.model.js', () => ({
    User: {
        findById: vi.fn(),
    },
}));

const buildCurrentAuthSession = () => ({
    _id: 'session-id',
    user: 'user-id',
    familyId: 'family-id',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    revokedReason: null,
    usedAt: null,
    replacedBySession: null,
    compromisedAt: null,
});

describe('rotateAuthSession — fermeture de compte', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        AuthSession.findOne.mockResolvedValue(
            buildCurrentAuthSession(),
        );
    });

    it.each([
        ['deletion_requested', 'Fermeture du compte en cours'],
        ['closed', 'Compte clôturé'],
    ])(
        'refuse la rotation lorsque le User est %s',
        async (status, message) => {
            User.findById.mockResolvedValue({
                _id: 'user-id',
                status,
            });

            await expect(
                rotateAuthSession({
                    refreshToken: 'existing-refresh-token',
                }),
            ).rejects.toMatchObject({
                statusCode: 403,
                message,
            });

            expect(
                AuthSession.findOneAndUpdate,
            ).not.toHaveBeenCalled();
            expect(AuthSession.create).not.toHaveBeenCalled();
        },
    );
});
