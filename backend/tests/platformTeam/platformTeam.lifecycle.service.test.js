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
    PLATFORM_TEAM_MEMBER_STATUS,
    PLATFORM_TEAM_ROLE_KEY,
} from '../../constants/platformTeam.constants.js';
import {
    revokePlatformTeamMember,
    suspendPlatformTeamMember,
} from '../../modules/platformTeam/platformTeam.service.js';
import { PlatformRole } from '../../modules/platformRole/platformRole.model.js';
import { PlatformTeamMember } from '../../modules/platformTeam/platformTeamMember.model.js';
import { User } from '../../modules/users/user.model.js';
import { createAuditLog } from '../../modules/auditLog/auditLog.service.js';
import {
    resolvePlatformAuthorization,
} from '../../modules/platformTeam/platformAuthorization.service.js';

vi.mock('mongoose', () => ({
    default: {
        connection: { transaction: vi.fn() },
        trusted: vi.fn((value) => value),
    },
}));
vi.mock('../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: vi.fn(),
}));
vi.mock('../../modules/users/user.model.js', () => ({
    User: { findById: vi.fn() },
}));
vi.mock('../../modules/platformRole/platformRole.model.js', () => ({
    PlatformRole: {
        findById: vi.fn(),
        findOne: vi.fn(),
    },
}));
vi.mock('../../modules/platformTeam/platformTeamMember.model.js', () => ({
    PlatformTeamMember: {
        findOne: vi.fn(),
        findById: vi.fn(),
        countDocuments: vi.fn(),
    },
}));
vi.mock('../../modules/platformTeam/platformAuthorization.service.js', () => ({
    getPlatformRoleEffectivePermissions: vi.fn(() => []),
    resolvePlatformAuthorization: vi.fn(),
}));

const queryResult = (value) => ({
    session: vi.fn().mockResolvedValue(value),
});

const superAdminAuthorization = {
    roleKey: PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
    permissions: [
        PLATFORM_PERMISSION.TEAM_MEMBER_SUSPEND,
        PLATFORM_PERMISSION.TEAM_MEMBER_REVOKE,
        PLATFORM_PERMISSION.SUPER_ADMINS_MANAGE,
    ],
};

const actor = { _id: 'actor-user-id' };


describe('Platform Team lifecycle services', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        const session = { id: 'session' };
        mongoose.connection.transaction.mockImplementation(
            async (callback) => callback(session),
        );
        User.findById.mockReturnValue(queryResult(actor));
        resolvePlatformAuthorization.mockResolvedValue(
            superAdminAuthorization,
        );
        createAuditLog.mockResolvedValue(undefined);
    });

    it('suspend un membre actif dans la transaction et audite la mutation', async () => {
        const member = {
            _id: 'member-id',
            user: 'support-user-id',
            role: 'support-role-id',
            status: PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
            isFounder: false,
            save: vi.fn().mockResolvedValue(undefined),
        };
        const role = {
            _id: 'support-role-id',
            key: PLATFORM_TEAM_ROLE_KEY.TECHNICAL_SUPPORT,
        };

        PlatformTeamMember.findOne.mockReturnValue(queryResult(member));
        PlatformRole.findById.mockReturnValue(queryResult(role));

        const result = await suspendPlatformTeamMember({
            memberId: 'member-id',
            actorId: 'actor-user-id',
        });

        expect(mongoose.trusted).toHaveBeenCalledWith({
            $in: [
                PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
                PLATFORM_TEAM_MEMBER_STATUS.SUSPENDED,
            ],
        });
        expect(member.status).toBe(
            PLATFORM_TEAM_MEMBER_STATUS.SUSPENDED,
        );
        expect(member.save).toHaveBeenCalledWith({
            session: { id: 'session' },
        });
        expect(createAuditLog).toHaveBeenCalledOnce();
        expect(result.member).toBe(member);
        expect(PlatformTeamMember.countDocuments).not.toHaveBeenCalled();
    });

    it('retire un Super administrateur déjà suspendu sans recompter les actifs', async () => {
        const member = {
            _id: 'member-id',
            user: 'other-super-admin-id',
            role: 'super-role-id',
            status: PLATFORM_TEAM_MEMBER_STATUS.SUSPENDED,
            isFounder: false,
            save: vi.fn().mockResolvedValue(undefined),
        };
        const role = {
            _id: 'super-role-id',
            key: PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
        };

        PlatformTeamMember.findOne.mockReturnValue(queryResult(member));
        PlatformRole.findById.mockReturnValue(queryResult(role));

        const result = await revokePlatformTeamMember({
            memberId: 'member-id',
            actorId: 'actor-user-id',
        });

        expect(member.status).toBe(
            PLATFORM_TEAM_MEMBER_STATUS.REVOKED,
        );
        expect(PlatformRole.findOne).not.toHaveBeenCalled();
        expect(PlatformTeamMember.countDocuments).not.toHaveBeenCalled();
        expect(createAuditLog).toHaveBeenCalledOnce();
        expect(result.member).toBe(member);
    });
});
