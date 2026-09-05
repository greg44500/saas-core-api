import mongoose from 'mongoose';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    PLATFORM_INVITATION_STATUS,
    PLATFORM_TEAM_MEMBER_STATUS,
} from '../../constants/platformTeam.constants.js';
import { PLATFORM_ROLE } from '../../constants/platformRoles.constants.js';
import { USER_STATUS } from '../../constants/userStatus.constants.js';
import {
    acceptExistingPlatformInvitation,
} from '../../modules/platformInvitation/acceptPlatformInvitation.service.js';
import { PlatformInvitation } from '../../modules/platformInvitation/platformInvitation.model.js';
import { PlatformRole } from '../../modules/platformRole/platformRole.model.js';
import {
    PlatformTeamMember,
} from '../../modules/platformTeam/platformTeamMember.model.js';
import { User } from '../../modules/users/user.model.js';
import { createAuditLog } from '../../modules/auditLog/auditLog.service.js';
import {
    assertAssignablePlatformRole,
    hashPlatformInvitationToken,
} from '../../modules/platformInvitation/platformInvitation.service.js';

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
    User: { findById: vi.fn() },
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
    PlatformInvitation: { findOne: vi.fn() },
}));

vi.mock('../../modules/platformInvitation/platformInvitation.service.js', () => ({
    assertAssignablePlatformRole: vi.fn(),
    hashPlatformInvitationToken: vi.fn(() => 'digest'),
}));

const chainedResult = (value) => ({
    select() { return this; },
    session: vi.fn().mockResolvedValue(value),
});

const sessionResult = (value) => ({
    session: vi.fn().mockResolvedValue(value),
});

const setup = ({ actorEmail = 'member@example.com', existingMember = null } = {}) => {
    const session = { id: 'session' };
    const invitation = {
        _id: 'invitation-id',
        role: 'role-id',
        invitedBy: 'inviter-id',
        emailCanonical: 'member@example.com',
        status: PLATFORM_INVITATION_STATUS.PENDING,
        save: vi.fn().mockResolvedValue(undefined),
    };
    const role = {
        _id: 'role-id',
        key: 'technical_support',
        name: 'Support technique',
        permissions: [],
        status: 'active',
    };
    const membership = {
        _id: 'membership-id',
        status: PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
    };

    mongoose.connection.transaction.mockImplementation(
        async (callback) => callback(session),
    );

    User.findById.mockImplementation((id) => {
        if (id === 'actor-id') {
            return chainedResult({
                _id: 'actor-id',
                emailCanonical: actorEmail,
                status: USER_STATUS.ACTIVE,
            });
        }

        return chainedResult({
            _id: 'inviter-id',
            platformRole: PLATFORM_ROLE.SUPER_ADMIN,
            status: USER_STATUS.ACTIVE,
        });
    });

    PlatformInvitation.findOne.mockReturnValue(
        sessionResult(invitation),
    );
    PlatformRole.findById.mockReturnValue(sessionResult(role));
    PlatformTeamMember.findOne.mockReturnValue(
        sessionResult(existingMember),
    );
    PlatformTeamMember.create.mockResolvedValue([membership]);
    createAuditLog.mockResolvedValue(undefined);

    return { invitation, membership, role, session };
};

describe('acceptExistingPlatformInvitation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        hashPlatformInvitationToken.mockReturnValue('digest');
    });

    it('crée une appartenance lorsque le compte authentifié correspond', async () => {
        const { invitation, membership, role, session } = setup();

        const result = await acceptExistingPlatformInvitation({
            token: 'a'.repeat(64),
            actorId: 'actor-id',
        });

        expect(assertAssignablePlatformRole).toHaveBeenCalledWith({
            role,
            actorPlatformRole: PLATFORM_ROLE.SUPER_ADMIN,
        });
        expect(PlatformTeamMember.create).toHaveBeenCalledOnce();
        expect(invitation.status).toBe(
            PLATFORM_INVITATION_STATUS.ACCEPTED,
        );
        expect(invitation.acceptedBy).toBe('actor-id');
        expect(invitation.save).toHaveBeenCalledWith({ session });
        expect(createAuditLog).toHaveBeenCalledOnce();
        expect(result.membership).toBe(membership);
    });

    it('refuse lorsque l’email du compte authentifié diffère', async () => {
        setup({ actorEmail: 'other@example.com' });

        await expect(
            acceptExistingPlatformInvitation({
                token: 'a'.repeat(64),
                actorId: 'actor-id',
            }),
        ).rejects.toMatchObject({ statusCode: 403 });

        expect(PlatformTeamMember.create).not.toHaveBeenCalled();
        expect(createAuditLog).not.toHaveBeenCalled();
    });

    it('refuse un second membership actif', async () => {
        setup({
            existingMember: {
                _id: 'existing-member-id',
                status: PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
            },
        });

        await expect(
            acceptExistingPlatformInvitation({
                token: 'a'.repeat(64),
                actorId: 'actor-id',
            }),
        ).rejects.toMatchObject({ statusCode: 409 });

        expect(PlatformTeamMember.create).not.toHaveBeenCalled();
    });
});
