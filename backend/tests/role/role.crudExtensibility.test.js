import mongoose from 'mongoose';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';

vi.mock(
    '../../modules/auditLog/auditLog.service.js',
    () => ({
        createAuditLog: vi.fn().mockResolvedValue(undefined),
    }),
);

import { Role } from '../../modules/role/role.model.js';
import {
    createWorkspaceRole,
    updateWorkspaceRole,
} from '../../modules/role/role.service.js';
import {
    createRolePermissionRegistry,
} from '../../modules/role/rolePermission.registry.js';


const APP_PERMISSION = 'catalog:item:read';

const createApplicationRegistry = () => createRolePermissionRegistry({
    permissions: [
        ...Object.values(CORE_PERMISSION),
        APP_PERMISSION,
    ],
    reservedPermissions: [
        CORE_PERMISSION.WORKSPACE_OWNERSHIP_TRANSFER,
    ],
});


describe('workspace role CRUD with application permissions', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('crée un rôle personnalisé avec une permission applicative enregistrée', async () => {
        const permissionRegistry = createApplicationRegistry();
        const session = { id: 'mongo-session' };
        const workspaceId = new mongoose.Types.ObjectId();
        const actorId = new mongoose.Types.ObjectId();

        vi.spyOn(mongoose.connection, 'transaction')
            .mockImplementation(async (callback) => callback(session));

        const saveSpy = vi
            .spyOn(Role.prototype, 'save')
            .mockImplementation(async function saveRole() {
                return this;
            });

        const result = await createWorkspaceRole({
            workspaceId,
            actorId,
            actorPermissions: [
                CORE_PERMISSION.ROLE_CREATE,
                APP_PERMISSION,
            ],
            name: 'Catalogue',
            permissions: [APP_PERMISSION],
            permissionRegistry,
        });

        expect(result.permissions).toEqual([APP_PERMISSION]);
        expect(saveSpy).toHaveBeenCalledOnce();
        expect([...saveSpy.mock.instances[0].permissions]).toEqual([
            APP_PERMISSION,
        ]);
    });

    it('met à jour un rôle personnalisé avec une permission applicative enregistrée', async () => {
        const permissionRegistry = createApplicationRegistry();
        const session = { id: 'mongo-session' };
        const workspaceId = new mongoose.Types.ObjectId();
        const actorId = new mongoose.Types.ObjectId();

        const role = new Role({
            workspace: workspaceId,
            key: 'custom-catalog',
            name: 'Catalogue',
            permissions: [CORE_PERMISSION.WORKSPACE_READ],
            isSystem: false,
            isEditable: true,
            createdBy: actorId,
            updatedBy: actorId,
        });

        vi.spyOn(mongoose.connection, 'transaction')
            .mockImplementation(async (callback) => callback(session));

        const sessionSpy = vi.fn().mockResolvedValue(role);
        vi.spyOn(Role, 'findOne').mockReturnValue({
            session: sessionSpy,
        });

        const saveSpy = vi
            .spyOn(Role.prototype, 'save')
            .mockImplementation(async function saveRole() {
                return this;
            });

        const result = await updateWorkspaceRole({
            workspaceId,
            roleId: role._id,
            actorId,
            actorPermissions: [
                CORE_PERMISSION.ROLE_UPDATE,
                CORE_PERMISSION.WORKSPACE_READ,
                APP_PERMISSION,
            ],
            changes: {
                permissions: [
                    CORE_PERMISSION.WORKSPACE_READ,
                    APP_PERMISSION,
                ],
            },
            permissionRegistry,
        });

        expect(sessionSpy).toHaveBeenCalledWith(session);
        expect(saveSpy).toHaveBeenCalledOnce();
        expect(result.permissions).toEqual([
            CORE_PERMISSION.WORKSPACE_READ,
            APP_PERMISSION,
        ]);
    });
});
