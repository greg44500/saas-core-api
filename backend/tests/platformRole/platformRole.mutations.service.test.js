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
    PLATFORM_TEAM_ROLE_KEY,
} from '../../constants/platformTeam.constants.js';
import { createAuditLog } from '../../modules/auditLog/auditLog.service.js';
import {
    createCustomPlatformRole,
    updateCustomPlatformRole,
} from '../../modules/platformRole/platformRole.service.js';
import { PlatformRole } from '../../modules/platformRole/platformRole.model.js';
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

const actor = { _id: 'actor-user-id' };

const superAdminAuthorization = {
    roleKey: PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
    permissions: [
        PLATFORM_PERMISSION.ROLES_CREATE,
        PLATFORM_PERMISSION.ROLES_UPDATE,
        PLATFORM_PERMISSION.OVERVIEW_READ,
        PLATFORM_PERMISSION.USERS_READ,
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


describe('PlatformRole mutation services', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mongoose.connection.transaction.mockImplementation(
            async (callback) => callback({ id: 'session' }),
        );
        User.findById.mockReturnValue(queryResult(actor));
        resolvePlatformAuthorization.mockResolvedValue(
            superAdminAuthorization,
        );
        createAuditLog.mockResolvedValue(undefined);
        getPlatformRoleEffectivePermissions.mockImplementation(
            (role) => [...(role?.permissions ?? [])],
        );
    });

    it('crée un rôle personnalisé avec une clé opaque générée uniquement par le backend', async () => {
        PlatformRole.create.mockImplementation(async ([payload]) => ([
            makeRole({
                key: payload.key,
                name: payload.name,
                description: payload.description,
                permissions: payload.permissions,
            }),
        ]));

        const result = await createCustomPlatformRole({
            roleData: {
                name: 'Support catalogue',
                permissions: [PLATFORM_PERMISSION.OVERVIEW_READ],
            },
            actorId: actor._id,
        });

        const [createdDocuments, options] = PlatformRole.create.mock.calls[0];
        expect(createdDocuments[0].key).toMatch(
            /^custom_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
        expect(createdDocuments[0]).toMatchObject({
            isSystem: false,
            status: PLATFORM_ROLE_STATUS.ACTIVE,
            createdBy: actor._id,
            updatedBy: actor._id,
        });
        expect(options).toEqual({ session: { id: 'session' } });
        expect(result.key).toBe(createdDocuments[0].key);
        expect(createAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                action: AUDIT_ACTION.PLATFORM_ROLE_CREATED,
            }),
            { session: { id: 'session' } },
        );
    });

    it('refuse la création si l’autorité runtime a perdu roles:create', async () => {
        resolvePlatformAuthorization.mockResolvedValue({
            roleKey: PLATFORM_TEAM_ROLE_KEY.PLATFORM_ADMIN,
            permissions: [PLATFORM_PERMISSION.OVERVIEW_READ],
        });

        await expect(createCustomPlatformRole({
            roleData: {
                name: 'Support catalogue',
                permissions: [],
            },
            actorId: actor._id,
        })).rejects.toMatchObject({ statusCode: 403 });

        expect(PlatformRole.create).not.toHaveBeenCalled();
        expect(createAuditLog).not.toHaveBeenCalled();
    });

    it('modifie uniquement les champs métier autorisés et conserve la clé technique', async () => {
        const role = makeRole();
        PlatformRole.findById.mockReturnValue(queryResult(role));

        const result = await updateCustomPlatformRole({
            roleId: role._id,
            roleData: {
                name: 'Responsable catalogue',
                permissions: [
                    PLATFORM_PERMISSION.OVERVIEW_READ,
                    PLATFORM_PERMISSION.USERS_READ,
                ],
            },
            actorId: actor._id,
        });

        expect(role.name).toBe('Responsable catalogue');
        expect(role.permissions).toEqual([
            PLATFORM_PERMISSION.OVERVIEW_READ,
            PLATFORM_PERMISSION.USERS_READ,
        ]);
        expect(role.key).toBe(
            'custom_00000000-0000-4000-8000-000000000000',
        );
        expect(role.save).toHaveBeenCalledWith({
            session: { id: 'session' },
        });
        expect(result.key).toBe(role.key);
        expect(createAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                action: AUDIT_ACTION.PLATFORM_ROLE_UPDATED,
                metadata: expect.objectContaining({
                    updatedFields: ['name', 'permissions'],
                }),
            }),
            { session: { id: 'session' } },
        );
    });

    it('empêche un acteur ordinaire de modifier un rôle de puissance égale', async () => {
        resolvePlatformAuthorization.mockResolvedValue({
            roleKey: PLATFORM_TEAM_ROLE_KEY.PLATFORM_ADMIN,
            permissions: [
                PLATFORM_PERMISSION.ROLES_UPDATE,
                PLATFORM_PERMISSION.OVERVIEW_READ,
            ],
        });
        const role = makeRole({
            permissions: [
                PLATFORM_PERMISSION.ROLES_UPDATE,
                PLATFORM_PERMISSION.OVERVIEW_READ,
            ],
        });
        PlatformRole.findById.mockReturnValue(queryResult(role));

        await expect(updateCustomPlatformRole({
            roleId: role._id,
            roleData: { name: 'Même puissance' },
            actorId: actor._id,
        })).rejects.toMatchObject({ statusCode: 403 });

        expect(role.save).not.toHaveBeenCalled();
        expect(createAuditLog).not.toHaveBeenCalled();
    });
});
