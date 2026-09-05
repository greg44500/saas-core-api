import mongoose from 'mongoose';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    PLATFORM_TEAM_ROLE_KEY,
} from '../../constants/platformTeam.constants.js';
import { USER_STATUS } from '../../constants/userStatus.constants.js';
import {
    acceptNewPlatformInvitation,
} from '../../modules/platformInvitation/acceptPlatformInvitation.service.js';
import { PlatformInvitation } from '../../modules/platformInvitation/platformInvitation.model.js';
import { PlatformRole } from '../../modules/platformRole/platformRole.model.js';
import {
    PlatformTeamMember,
} from '../../modules/platformTeam/platformTeamMember.model.js';
import { User } from '../../modules/users/user.model.js';
import { AuthIdentity } from '../../modules/authIdentities/authIdentity.model.js';
import { createAuditLog } from '../../modules/auditLog/auditLog.service.js';
import { hashPassword } from '../../utils/password.js';
import {
    hashPlatformInvitationToken,
} from '../../modules/platformInvitation/platformInvitation.service.js';
import {
    resolvePlatformAuthorization,
} from '../../modules/platformTeam/platformAuthorization.service.js';
import {
    assertActorCanAssignRole,
} from '../../modules/platformTeam/platformTeam.service.js';

vi.mock('mongoose', () => ({
    default: {
        connection: { transaction: vi.fn() },
        trusted: (value) => value,
    },
}));

vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: vi.fn(),
}));
vi.mock('../../modules/users/user.model.js', () => ({
    User: {
        findById: vi.fn(),
        findOne: vi.fn(),
        create: vi.fn(),
    },
}));
vi.mock('../../modules/authIdentities/authIdentity.model.js', () => ({
    AuthIdentity: { create: vi.fn() },
}));
vi.mock('../../modules/platformRole/platformRole.model.js', () => ({
    PlatformRole: { findById: vi.fn() },
}));
vi.mock('../../modules/platformTeam/platformTeamMember.model.js', () => ({
    PlatformTeamMember: {
        findOne: vi.fn(),
        create: vi.fn(),
    },
}));
vi.mock('../../modules/platformInvitation/platformInvitation.model.js', () => ({
    PlatformInvitation: {
        exists: vi.fn(),
        findOne: vi.fn(),
    },
}));
vi.mock('../../utils/password.js', () => ({
    hashPassword: vi.fn(),
}));
vi.mock('../../modules/platformInvitation/platformInvitation.service.js', () => ({
    hashPlatformInvitationToken: vi.fn(() => 'digest'),
}));
vi.mock('../../modules/platformTeam/platformAuthorization.service.js', () => ({
    resolvePlatformAuthorization: vi.fn(),
}));
vi.mock('../../modules/platformTeam/platformTeam.service.js', () => ({
    assertActorCanAssignRole: vi.fn(),
}));

const chainedResult = (value) => ({
    select() { return this; },
    session: vi.fn().mockResolvedValue(value),
});
const sessionResult = (value) => ({
    session: vi.fn().mockResolvedValue(value),
});

const setup = ({ existingUser = null } = {}) => {
    const session = { id: 'session' };
    const invitation = {
        _id: 'invitation-id',
        role: 'role-id',
        invitedBy: 'inviter-id',
        emailCanonical: 'new.member@example.com',
        firstName: 'Marie',
        lastName: 'Martin',
        save: vi.fn().mockResolvedValue(undefined),
    };
    const role = {
        _id: 'role-id',
        key: 'customer_support',
        name: 'Support client',
        permissions: [],
        status: 'active',
    };
    const inviter = {
        _id: 'inviter-id',
        status: USER_STATUS.ACTIVE,
    };
    const user = {
        _id: 'new-user-id',
        firstName: 'Marie',
        lastName: 'Martin',
        email: 'new.member@example.com',
    };
    const membership = {
        _id: 'membership-id',
        status: 'active',
    };

    PlatformInvitation.exists.mockResolvedValue({ _id: 'invitation-id' });
    mongoose.connection.transaction.mockImplementation(
        async (callback) => callback(session),
    );
    PlatformInvitation.findOne.mockReturnValue(sessionResult(invitation));
    PlatformRole.findById.mockReturnValue(sessionResult(role));
    User.findById.mockReturnValue(chainedResult(inviter));
    User.findOne.mockReturnValue(chainedResult(existingUser));
    User.create.mockResolvedValue([user]);
    AuthIdentity.create.mockResolvedValue([{}]);
    PlatformTeamMember.create.mockResolvedValue([membership]);
    createAuditLog.mockResolvedValue(undefined);
    hashPassword.mockResolvedValue('password-hash');
    resolvePlatformAuthorization.mockResolvedValue({
        roleKey: PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
        permissions: [],
    });

    return { invitation, membership, role, session, user };
};

describe('acceptNewPlatformInvitation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        hashPlatformInvitationToken.mockReturnValue('digest');
    });

    it('refuse de créer un second User pour un email existant', async () => {
        setup({ existingUser: { _id: 'existing-user-id' } });

        await expect(
            acceptNewPlatformInvitation({
                token: 'a'.repeat(64),
                password: 'x'.repeat(20),
            }),
        ).rejects.toMatchObject({ statusCode: 409 });

        expect(User.create).not.toHaveBeenCalled();
        expect(AuthIdentity.create).not.toHaveBeenCalled();
        expect(PlatformTeamMember.create).not.toHaveBeenCalled();
    });

    it('crée User, AuthIdentity et membership dans la même transaction', async () => {
        const { invitation, membership, role, session, user } = setup();

        const result = await acceptNewPlatformInvitation({
            token: 'a'.repeat(64),
            password: 'x'.repeat(20),
        });

        expect(hashPassword).toHaveBeenCalledOnce();
        expect(resolvePlatformAuthorization).toHaveBeenCalledOnce();
        expect(assertActorCanAssignRole).toHaveBeenCalledWith({
            authorization: expect.objectContaining({
                roleKey: PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
            }),
            role,
        });
        expect(User.create).toHaveBeenCalledWith(
            [
                expect.objectContaining({
                    firstName: invitation.firstName,
                    lastName: invitation.lastName,
                    email: invitation.emailCanonical,
                    emailCanonical: invitation.emailCanonical,
                }),
            ],
            { session },
        );
        expect(AuthIdentity.create).toHaveBeenCalledOnce();
        expect(PlatformTeamMember.create).toHaveBeenCalledOnce();
        expect(createAuditLog).toHaveBeenCalledOnce();
        expect(result.user).toBe(user);
        expect(result.membership).toBe(membership);
    });
});
