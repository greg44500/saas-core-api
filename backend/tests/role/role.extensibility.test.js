import mongoose from 'mongoose';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import { Role } from '../../modules/role/role.model.js';
import {
    assertCustomRolePermissions,
    createSystemRolesForWorkspace,
} from '../../modules/role/role.service.js';
import {
    createRolePermissionRegistry,
} from '../../modules/role/rolePermission.registry.js';


const APP_PERMISSION = 'catalog:item:read';
const APP_RESERVED_PERMISSION = 'catalog:governance:transfer';

const createApplicationRegistry = () => createRolePermissionRegistry({
    permissions: [
        ...Object.values(CORE_PERMISSION),
        APP_PERMISSION,
        APP_RESERVED_PERMISSION,
    ],
    reservedPermissions: [
        CORE_PERMISSION.WORKSPACE_OWNERSHIP_TRANSFER,
        APP_RESERVED_PERMISSION,
    ],
    systemRolePermissions: {
        owner: [
            APP_PERMISSION,
            APP_RESERVED_PERMISSION,
        ],
        admin: [APP_PERMISSION],
        manager: [APP_PERMISSION],
    },
});


describe('role RBAC extensibility', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('accepte une permission applicative enregistrée sans casser l’anti-escalade', () => {
        const permissionRegistry = createApplicationRegistry();

        expect(assertCustomRolePermissions({
            permissions: [APP_PERMISSION, APP_PERMISSION],
            actorPermissions: [
                APP_PERMISSION,
                CORE_PERMISSION.ROLE_CREATE,
            ],
            permissionRegistry,
        })).toEqual([APP_PERMISSION]);

        expect(() => assertCustomRolePermissions({
            permissions: [APP_PERMISSION],
            actorPermissions: [CORE_PERMISSION.ROLE_CREATE],
            permissionRegistry,
        })).toThrow(
            'Vous ne pouvez pas attribuer un rôle contenant des permissions que vous ne possédez pas.',
        );
    });

    it('refuse une permission applicative réservée dans un rôle personnalisé', () => {
        const permissionRegistry = createApplicationRegistry();

        expect(() => assertCustomRolePermissions({
            permissions: [APP_RESERVED_PERMISSION],
            actorPermissions: [APP_RESERVED_PERMISSION],
            permissionRegistry,
        })).toThrow(
            'Cette permission de gouvernance ne peut pas être attribuée à un rôle personnalisé.',
        );
    });

    it('crée les rôles système avec la politique applicative injectée', async () => {
        const permissionRegistry = createApplicationRegistry();
        const session = { id: 'mongo-session' };

        const insertManySpy = vi
            .spyOn(Role, 'insertMany')
            .mockResolvedValue([]);

        await createSystemRolesForWorkspace({
            workspaceId: new mongoose.Types.ObjectId(),
            actorId: new mongoose.Types.ObjectId(),
            session,
            permissionRegistry,
        });

        const [rolesToCreate] = insertManySpy.mock.calls[0];

        const ownerRole = rolesToCreate.find(
            ({ key }) => key === 'owner',
        );
        const adminRole = rolesToCreate.find(
            ({ key }) => key === 'admin',
        );
        const managerRole = rolesToCreate.find(
            ({ key }) => key === 'manager',
        );
        const memberRole = rolesToCreate.find(
            ({ key }) => key === 'member',
        );

        expect(ownerRole.permissions).toEqual(
            expect.arrayContaining([
                APP_PERMISSION,
                APP_RESERVED_PERMISSION,
            ]),
        );
        expect(adminRole.permissions).toContain(APP_PERMISSION);
        expect(managerRole.permissions).toContain(APP_PERMISSION);
        expect(memberRole.permissions).not.toContain(APP_PERMISSION);
    });
});
