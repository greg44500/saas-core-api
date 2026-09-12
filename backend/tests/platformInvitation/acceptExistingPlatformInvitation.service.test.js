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
    PLATFORM_TEAM_ROLE_KEY,
} from '../../constants/platformTeam.constants.js';
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
vi.mock('../../modules/legalAcceptance/legalAcceptance.service.js', () => ({
    createRegistrationLegalAcceptance: vi.fn(),
}));
vi.mock('../../modules/users/user.model.js', () => ({
    User: { findById: vi.fn() },
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
        findOne: vi.fn(),
        findOneAndUpdate: vi.fn(),
    },
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

const deferred = () => {
    let resolve;
    const promise = new Promise((resolver) => {
        resolve = resolver;
    });

    return { promise, resolve };
};

const flushUntil = async (predicate, attempts = 10) => {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        if (predicate()) {
            return;
        }
        await Promise.resolve();
    }
};

const setup = ({ actorEmail = 'member@example.com', existingMember = null } = {}) => {
    const session = { id: 'session' };
    const now = new Date('2026-09-10T18:00:00.000Z');
    const invitation = {
        _id: 'invitation-id',
        role: 'role-id',
        invitedBy: 'inviter-id',
        emailCanonical: 'member@example.com',
        status: PLATFORM_INVITATION_STATUS.PENDING,
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
    const acceptedInvitation = {
        ...invitation,
        status: PLATFORM_INVITATION_STATUS.ACCEPTED,
        acceptedBy: 'actor-id',
        acceptedAt: now,
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
            status: USER_STATUS.ACTIVE,
        });
    });

    resolvePlatformAuthorization.mockResolvedValue({
        roleKey: PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
        permissions: [],
    });
    PlatformInvitation.findOne.mockReturnValue(
        sessionResult(invitation),
    );
    PlatformInvitation.findOneAndUpdate.mockResolvedValue(acceptedInvitation);
    PlatformRole.findById.mockReturnValue(sessionResult(role));
    PlatformTeamMember.findOne.mockReturnValue(
        sessionResult(existingMember),
    );
    PlatformTeamMember.create.mockResolvedValue([membership]);
    createAuditLog.mockResolvedValue(undefined);

    return {
        acceptedInvitation,
        invitation,
        membership,
        now,
        role,
        session,
    };
};

describe('acceptExistingPlatformInvitation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        hashPlatformInvitationToken.mockReturnValue('digest');
    });

    it('crée une appartenance puis consomme atomiquement l’invitation correspondante', async () => {
        const {
            acceptedInvitation,
            invitation,
            membership,
            now,
            role,
            session,
        } = setup();

        const result = await acceptExistingPlatformInvitation({
            token: 'a'.repeat(64),
            actorId: 'actor-id',
            now,
        });

        expect(resolvePlatformAuthorization).toHaveBeenCalledOnce();
        expect(assertActorCanAssignRole).toHaveBeenCalledWith({
            authorization: expect.objectContaining({
                roleKey: PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
            }),
            role,
        });
        expect(PlatformTeamMember.create).toHaveBeenCalledOnce();
        expect(PlatformInvitation.findOneAndUpdate).toHaveBeenCalledWith(
            {
                _id: invitation._id,
                tokenHash: 'digest',
                status: PLATFORM_INVITATION_STATUS.PENDING,
                expiresAt: { $gt: now },
            },
            {
                $set: {
                    status: PLATFORM_INVITATION_STATUS.ACCEPTED,
                    acceptedBy: 'actor-id',
                    acceptedAt: now,
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );
        expect(createAuditLog).toHaveBeenCalledOnce();
        expect(result.invitation).toBe(acceptedInvitation);
        expect(result.membership).toBe(membership);
    });

    it('échoue fermé si la consommation conditionnelle perd une course', async () => {
        setup();
        PlatformInvitation.findOneAndUpdate.mockResolvedValue(null);

        await expect(
            acceptExistingPlatformInvitation({
                token: 'a'.repeat(64),
                actorId: 'actor-id',
            }),
        ).rejects.toMatchObject({ statusCode: 409 });

        expect(createAuditLog).not.toHaveBeenCalled();
    });

    it('séquence le rôle puis l’invitant dans la même transaction', async () => {
        const { role } = setup();
        const roleLookup = deferred();

        PlatformRole.findById.mockReturnValue({
            session: vi.fn().mockReturnValue(roleLookup.promise),
        });

        const operation = acceptExistingPlatformInvitation({
            token: 'a'.repeat(64),
            actorId: 'actor-id',
        });

        await flushUntil(() => PlatformRole.findById.mock.calls.length > 0);

        expect(PlatformRole.findById).toHaveBeenCalledWith('role-id');
        expect(
            User.findById.mock.calls.some(([id]) => id === 'inviter-id'),
        ).toBe(false);

        roleLookup.resolve(role);
        await operation;

        expect(
            User.findById.mock.calls.some(([id]) => id === 'inviter-id'),
        ).toBe(true);
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
        expect(PlatformInvitation.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('refuse lorsqu’une appartenance active existe déjà', async () => {
        setup({
            existingMember: {
                _id: 'existing-membership-id',
            },
        });

        await expect(
            acceptExistingPlatformInvitation({
                token: 'a'.repeat(64),
                actorId: 'actor-id',
            }),
        ).rejects.toMatchObject({ statusCode: 409 });

        expect(PlatformTeamMember.create).not.toHaveBeenCalled();
        expect(PlatformInvitation.findOneAndUpdate).not.toHaveBeenCalled();
    });
});
