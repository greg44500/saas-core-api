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
    PLATFORM_ROLE,
} from '../../constants/platformRoles.constants.js';
import {
    PLATFORM_ROLE_STATUS,
    PLATFORM_TEAM_MEMBER_STATUS,
    PLATFORM_TEAM_ROLE_KEY,
} from '../../constants/platformTeam.constants.js';
import {
    resolvePlatformAuthorization,
} from '../../modules/platformTeam/platformAuthorization.service.js';
import { PlatformRole } from '../../modules/platformRole/platformRole.model.js';
import { PlatformTeamMember } from '../../modules/platformTeam/platformTeamMember.model.js';

vi.mock('mongoose', () => ({
    default: {
        trusted: vi.fn((value) => value),
    },
}));
vi.mock('../../modules/platformRole/platformRole.model.js', () => ({
    PlatformRole: { findById: vi.fn() },
}));
vi.mock('../../modules/platformTeam/platformTeamMember.model.js', () => ({
    PlatformTeamMember: {
        findOne: vi.fn(),
        exists: vi.fn(),
    },
}));

const queryResult = (value) => ({
    session: vi.fn().mockResolvedValue(value),
    then(resolve, reject) {
        return Promise.resolve(value).then(resolve, reject);
    },
});

const user = {
    _id: 'user-id',
    platformRole: PLATFORM_ROLE.USER,
};


describe('resolvePlatformAuthorization', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        PlatformTeamMember.exists.mockReturnValue(queryResult(null));
    });

    it('utilise les permissions du PlatformRole pour un membre actif', async () => {
        PlatformTeamMember.findOne.mockReturnValue(queryResult({
            _id: 'member-id',
            role: 'role-id',
            status: PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
            isFounder: false,
        }));
        PlatformRole.findById.mockReturnValue(queryResult({
            _id: 'role-id',
            key: PLATFORM_TEAM_ROLE_KEY.TECHNICAL_SUPPORT,
            status: PLATFORM_ROLE_STATUS.ACTIVE,
            permissions: [
                PLATFORM_PERMISSION.USERS_READ,
                PLATFORM_PERMISSION.USERS_REVOKE_SESSIONS,
            ],
        }));

        const authorization = await resolvePlatformAuthorization({ user });

        expect(mongoose.trusted).toHaveBeenCalledWith({
            $in: [
                PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
                PLATFORM_TEAM_MEMBER_STATUS.SUSPENDED,
            ],
        });
        expect(authorization.source).toBe('team_member');
        expect(authorization.roleKey).toBe(
            PLATFORM_TEAM_ROLE_KEY.TECHNICAL_SUPPORT,
        );
        expect(authorization.permissions).toEqual([
            PLATFORM_PERMISSION.USERS_READ,
            PLATFORM_PERMISSION.USERS_REVOKE_SESSIONS,
        ]);
    });

    it('retire immédiatement toutes les permissions à un membre suspendu', async () => {
        PlatformTeamMember.findOne.mockReturnValue(queryResult({
            _id: 'member-id',
            role: 'role-id',
            status: PLATFORM_TEAM_MEMBER_STATUS.SUSPENDED,
            isFounder: false,
        }));

        const authorization = await resolvePlatformAuthorization({ user });

        expect(authorization.status).toBe(
            PLATFORM_TEAM_MEMBER_STATUS.SUSPENDED,
        );
        expect(authorization.permissions).toEqual([]);
        expect(PlatformRole.findById).not.toHaveBeenCalled();
    });

    it('n’utilise jamais le fallback legacy après un historique de membership', async () => {
        PlatformTeamMember.findOne.mockReturnValue(queryResult(null));
        PlatformTeamMember.exists.mockReturnValue(queryResult({
            _id: 'revoked-member-id',
        }));

        const authorization = await resolvePlatformAuthorization({
            user: {
                _id: 'user-id',
                platformRole: PLATFORM_ROLE.SUPER_ADMIN,
            },
        });

        expect(authorization.source).toBe('team_history');
        expect(authorization.permissions).toEqual([]);
    });

    it('préserve temporairement le super-admin historique sans membership', async () => {
        PlatformTeamMember.findOne.mockReturnValue(queryResult(null));
        PlatformTeamMember.exists.mockReturnValue(queryResult(null));

        const authorization = await resolvePlatformAuthorization({
            user: {
                _id: 'legacy-founder-id',
                platformRole: PLATFORM_ROLE.SUPER_ADMIN,
            },
        });

        expect(authorization.source).toBe('legacy_super_admin');
        expect(authorization.roleKey).toBe(
            PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
        );
        expect(authorization.permissions).toContain(
            PLATFORM_PERMISSION.SUPER_ADMINS_MANAGE,
        );
    });
});
