import mongoose from 'mongoose';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    PLATFORM_PERMISSION,
} from '../../constants/platformPermissions.constants.js';
import {
    PLATFORM_INVITATION_STATUS,
    PLATFORM_ROLE_STATUS,
    PLATFORM_TEAM_ROLE_KEY,
} from '../../constants/platformTeam.constants.js';
import {
    createPlatformInvitation,
    resendPlatformInvitation,
} from '../../modules/platformInvitation/platformInvitation.service.js';
import { PlatformInvitation } from '../../modules/platformInvitation/platformInvitation.model.js';
import { PlatformRole } from '../../modules/platformRole/platformRole.model.js';
import { PlatformTeamMember } from '../../modules/platformTeam/platformTeamMember.model.js';
import { User } from '../../modules/users/user.model.js';
import { createAuditLog } from '../../modules/auditLog/auditLog.service.js';
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
    },
}));
vi.mock('../../modules/platformRole/platformRole.model.js', () => ({
    PlatformRole: { findById: vi.fn() },
}));
vi.mock('../../modules/platformTeam/platformTeamMember.model.js', () => ({
    PlatformTeamMember: { findOne: vi.fn() },
}));
vi.mock('../../modules/platformInvitation/platformInvitation.model.js', () => ({
    PlatformInvitation: {
        updateMany: vi.fn(),
        findOne: vi.fn(),
        findById: vi.fn(),
        create: vi.fn(),
    },
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

describe('createPlatformInvitation', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        const session = { id: 'session' };
        mongoose.connection.transaction.mockImplementation(
            async (callback) => callback(session),
        );

        User.findById.mockReturnValue(chainedResult({
            _id: 'actor-id',
            status: 'active',
        }));
        resolvePlatformAuthorization.mockResolvedValue({
            roleKey: PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
            permissions: [
                PLATFORM_PERMISSION.TEAM_INVITE,
            ],
        });
        PlatformRole.findById.mockReturnValue(sessionResult({
            _id: 'role-id',
            key: PLATFORM_TEAM_ROLE_KEY.TECHNICAL_SUPPORT,
            name: 'Support technique',
            status: PLATFORM_ROLE_STATUS.ACTIVE,
            permissions: [PLATFORM_PERMISSION.USERS_READ],
        }));
        User.findOne.mockReturnValue(chainedResult(null));
        PlatformTeamMember.findOne.mockReturnValue(sessionResult(null));
        PlatformInvitation.updateMany.mockReturnValue(sessionResult({}));
        PlatformInvitation.findOne.mockReturnValue(sessionResult(null));
        PlatformInvitation.create.mockImplementation(async ([data]) => [{
            _id: 'invitation-id',
            ...data,
        }]);
        createAuditLog.mockResolvedValue(undefined);
    });

    it('persiste uniquement le hash du secret temporaire', async () => {
        const result = await createPlatformInvitation({
            firstName: 'Marie',
            lastName: 'Martin',
            email: 'Marie@Example.com',
            roleId: 'role-id',
            actorId: 'actor-id',
        });

        expect(result.token).toMatch(/^[a-f\d]{64}$/i);
        expect(resolvePlatformAuthorization).toHaveBeenCalledOnce();
        expect(assertActorCanAssignRole).toHaveBeenCalledOnce();

        const persisted = PlatformInvitation.create.mock.calls[0][0][0];

        expect(persisted).not.toHaveProperty('token');
        expect(persisted.tokenHash).toMatch(/^[a-f\d]{64}$/i);
        expect(persisted.tokenHash).not.toBe(result.token);
        expect(persisted.emailCanonical).toBe('marie@example.com');
        expect(createAuditLog).toHaveBeenCalledOnce();
    });

    it('séquence les lectures partageant la session lors de la création', async () => {
        const actorLookup = deferred();

        User.findById.mockReturnValue({
            select() { return this; },
            session: vi.fn().mockReturnValue(actorLookup.promise),
        });
        PlatformRole.findById.mockClear();

        const operation = createPlatformInvitation({
            firstName: 'Marie',
            lastName: 'Martin',
            email: 'marie@example.com',
            roleId: 'role-id',
            actorId: 'actor-id',
        });

        expect(PlatformRole.findById).not.toHaveBeenCalled();

        actorLookup.resolve({
            _id: 'actor-id',
            status: 'active',
        });

        await operation;

        expect(PlatformRole.findById).toHaveBeenCalledWith('role-id');
    });

    it('séquence les lectures partageant la session lors du renvoi', async () => {
        const actorLookup = deferred();
        const invitation = {
            _id: 'invitation-id',
            role: 'role-id',
            status: PLATFORM_INVITATION_STATUS.PENDING,
            expiresAt: new Date('2026-09-10T12:00:00.000Z'),
            save: vi.fn().mockResolvedValue(undefined),
        };

        User.findById.mockReturnValue({
            select() { return this; },
            session: vi.fn().mockReturnValue(actorLookup.promise),
        });
        resolvePlatformAuthorization.mockResolvedValue({
            roleKey: PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
            permissions: [
                PLATFORM_PERMISSION.TEAM_INVITATION_RESEND,
            ],
        });
        PlatformInvitation.findById.mockReturnValue(
            sessionResult(invitation),
        );
        PlatformInvitation.findById.mockClear();

        const operation = resendPlatformInvitation({
            invitationId: 'invitation-id',
            actorId: 'actor-id',
            now: new Date('2026-09-06T12:00:00.000Z'),
        });

        expect(PlatformInvitation.findById).not.toHaveBeenCalled();

        actorLookup.resolve({
            _id: 'actor-id',
            status: 'active',
        });

        await operation;

        expect(PlatformInvitation.findById).toHaveBeenCalledWith(
            'invitation-id',
        );
        expect(invitation.save).toHaveBeenCalledOnce();
    });
});
