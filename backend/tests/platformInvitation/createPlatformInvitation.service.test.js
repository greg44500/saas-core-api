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
import { PLATFORM_ROLE } from '../../constants/platformRoles.constants.js';
import {
    PLATFORM_ROLE_STATUS,
    PLATFORM_TEAM_ROLE_KEY,
} from '../../constants/platformTeam.constants.js';
import {
    createPlatformInvitation,
} from '../../modules/platformInvitation/platformInvitation.service.js';
import { PlatformInvitation } from '../../modules/platformInvitation/platformInvitation.model.js';
import { PlatformRole } from '../../modules/platformRole/platformRole.model.js';
import { PlatformTeamMember } from '../../modules/platformTeam/platformTeamMember.model.js';
import { User } from '../../modules/users/user.model.js';
import { createAuditLog } from '../../modules/auditLog/auditLog.service.js';

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
        create: vi.fn(),
    },
}));

const chainedResult = (value) => ({
    select() { return this; },
    session: vi.fn().mockResolvedValue(value),
});
const sessionResult = (value) => ({
    session: vi.fn().mockResolvedValue(value),
});

describe('createPlatformInvitation', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        const session = { id: 'session' };
        mongoose.connection.transaction.mockImplementation(
            async (callback) => callback(session),
        );

        User.findById.mockReturnValue(chainedResult({
            _id: 'actor-id',
            platformRole: PLATFORM_ROLE.SUPER_ADMIN,
        }));
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

        const persisted = PlatformInvitation.create.mock.calls[0][0][0];

        expect(persisted).not.toHaveProperty('token');
        expect(persisted.tokenHash).toMatch(/^[a-f\d]{64}$/i);
        expect(persisted.tokenHash).not.toBe(result.token);
        expect(persisted.emailCanonical).toBe('marie@example.com');
        expect(createAuditLog).toHaveBeenCalledOnce();
    });
});
