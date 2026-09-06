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
} from '../../constants/auditActions.constants.js';
import {
    PLATFORM_PERMISSION,
} from '../../constants/platformPermissions.constants.js';
import {
    PLATFORM_ROLE_STATUS,
    PLATFORM_TEAM_MEMBER_STATUS,
    PLATFORM_TEAM_ROLE_KEY,
} from '../../constants/platformTeam.constants.js';
import { createAuditLog } from '../../modules/auditLog/auditLog.service.js';
import {
    archiveCustomPlatformRole,
    getPlatformRoleById,
    listPlatformRoles,
} from '../../modules/platformRole/platformRole.service.js';
import { PlatformRole } from '../../modules/platformRole/platformRole.model.js';
import { PlatformTeamMember } from '../../modules/platformTeam/platformTeamMember.model.js';
import {
    getPlatformRoleEffectivePermissions,
    resolvePlatformAuthorization,
} from '../../modules/platformTeam/platformAuthorization.service.js';
import { User } from '../../modules/users/user.model.js';

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
        create: vi.fn(),
        findById: vi.fn(),
        find: vi.fn(),
        countDocuments: vi.fn(),
    },
}));
vi.mock('../../modules/platformTeam/platformTeamMember.model.js', () => ({
    PlatformTeamMember: { countDocuments: vi.fn() },
}));
vi.mock('../../modules/platformTeam/platformAuthorization.service.js', () => ({
    getPlatformRoleEffectivePermissions: vi.fn(
        (role) => [...(role?.permissions ?? [])],
    ),
    resolvePlatformAuthorization: vi.fn(),
}));

const queryResult = (value) => ({
    session: vi.fn().mockResolvedValue(value),
});

const leanQueryResult = (value) => ({
    lean: vi.fn().mockResolvedValue(value),
});

const actor = { _id: 'actor-user-id' };

const authorization = {
    roleKey: PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
    permissions: [
        PLATFORM_PERMISSION.ROLES_ARCHIVE,
        PLATFORM_PERMISSION.ROLES_READ,
        PLATFORM_PERMISSION.OVERVIEW_READ,
    ],
};

const makeRole = (overrides = {}) => ({
    _id: 'role-id',
    key: 'custom_00000000-0000-4000-8000-000000000000',
    name: 'Support catalogue',
    description: null,
    permissions: [PLATFORM_PERMISSION.OVERVIEW_READ],
    isSystem: false,
    status: PLATFORM_ROLE_STATUS.ACTIVE,
    createdBy: 'actor-user-id',
    updatedBy: 'actor-user-id',
    archivedAt: null,
    archivedBy: null,
    createdAt: new Date('2026-09-06T08:00:00.000Z'),
    updatedAt: new Date('2026-09-06T08:00:00.000Z'),
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
});


describe('PlatformRole read and archive services', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mongoose.connection.transaction.mockImplementation(
            async (callback) => callback({ id: 'session' }),
        );
        User.findById.mockReturnValue(queryResult(actor));
        resolvePlatformAuthorization.mockResolvedValue(authorization);
        getPlatformRoleEffectivePermissions.mockImplementation(
            (role) => [...(role?.permissions ?? [])],
        );
        createAuditLog.mockResolvedValue(undefined);
    });

    it('liste les rôles avec pagination sans masquer les rôles système', async () => {
        const roles = [
            makeRole({
                _id: 'system-role-id',
                key: PLATFORM_TEAM_ROLE_KEY.TECHNICAL_SUPPORT,
                name: 'Support technique',
                isSystem: true,
            }),
            makeRole(),
        ];
        const query = {
            sort: vi.fn().mockReturnThis(),
            skip: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            lean: vi.fn().mockResolvedValue(roles),
        };
        PlatformRole.find.mockReturnValue(query);
        PlatformRole.countDocuments.mockResolvedValue(2);

        const result = await listPlatformRoles({
            page: 1,
            limit: 20,
            status: PLATFORM_ROLE_STATUS.ACTIVE,
        });

        expect(PlatformRole.find).toHaveBeenCalledWith({
            status: PLATFORM_ROLE_STATUS.ACTIVE,
        });
        expect(result.roles).toHaveLength(2);
        expect(result.roles[0]).toMatchObject({
            key: PLATFORM_TEAM_ROLE_KEY.TECHNICAL_SUPPORT,
            isSystem: true,
        });
        expect(result.pagination).toEqual({
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1,
        });
    });

    it('retourne un rôle précis ou 404 sans inventer de donnée', async () => {
        const role = makeRole();
        PlatformRole.findById.mockReturnValue(leanQueryResult(role));

        await expect(getPlatformRoleById({
            roleId: role._id,
        })).resolves.toMatchObject({
            id: role._id,
            key: role.key,
            name: role.name,
        });

        PlatformRole.findById.mockReturnValue(leanQueryResult(null));

        await expect(getPlatformRoleById({
            roleId: 'missing-role-id',
        })).rejects.toMatchObject({ statusCode: 404 });
    });

    it('archive un rôle personnalisé inutilisé et conserve sanitizeFilter actif', async () => {
        const now = new Date('2026-09-06T10:00:00.000Z');
        const role = makeRole();
        PlatformRole.findById.mockReturnValue(queryResult(role));
        PlatformTeamMember.countDocuments.mockReturnValue(queryResult(0));

        const result = await archiveCustomPlatformRole({
            roleId: role._id,
            actorId: actor._id,
            now,
        });

        expect(mongoose.trusted).toHaveBeenCalledWith({
            $in: [
                PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
                PLATFORM_TEAM_MEMBER_STATUS.SUSPENDED,
            ],
        });
        expect(role.status).toBe(PLATFORM_ROLE_STATUS.ARCHIVED);
        expect(role.archivedAt).toBe(now);
        expect(role.archivedBy).toBe(actor._id);
        expect(role.save).toHaveBeenCalledWith({
            session: { id: 'session' },
        });
        expect(result.status).toBe(PLATFORM_ROLE_STATUS.ARCHIVED);
        expect(createAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                action: AUDIT_ACTION.PLATFORM_ROLE_ARCHIVED,
            }),
            { session: { id: 'session' } },
        );
    });

    it('refuse l’archivage lorsqu’un membre actif ou suspendu utilise encore le rôle', async () => {
        const role = makeRole();
        PlatformRole.findById.mockReturnValue(queryResult(role));
        PlatformTeamMember.countDocuments.mockReturnValue(queryResult(1));

        await expect(archiveCustomPlatformRole({
            roleId: role._id,
            actorId: actor._id,
        })).rejects.toMatchObject({ statusCode: 409 });

        expect(role.save).not.toHaveBeenCalled();
        expect(createAuditLog).not.toHaveBeenCalled();
    });

    it('refuse l’archivage d’un rôle système avant toute recherche d’usage', async () => {
        const role = makeRole({
            key: PLATFORM_TEAM_ROLE_KEY.TECHNICAL_SUPPORT,
            isSystem: true,
        });
        PlatformRole.findById.mockReturnValue(queryResult(role));

        await expect(archiveCustomPlatformRole({
            roleId: role._id,
            actorId: actor._id,
        })).rejects.toMatchObject({ statusCode: 409 });

        expect(PlatformTeamMember.countDocuments).not.toHaveBeenCalled();
        expect(role.save).not.toHaveBeenCalled();
    });
});
