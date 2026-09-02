import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import {
    backfillRegisteredSystemRolePermissions,
} from '../../migrations/backfillRegisteredSystemRolePermissions.migration.js';
import { Role } from '../../modules/role/role.model.js';
import {
    createRolePermissionRegistry,
} from '../../modules/role/rolePermission.registry.js';


const APP_PERMISSION = 'catalog:item:read';


describe('backfillRegisteredSystemRolePermissions migration', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('met à niveau uniquement les rôles système ciblés avec $addToSet', async () => {
        const permissionRegistry = createRolePermissionRegistry({
            permissions: [
                ...Object.values(CORE_PERMISSION),
                APP_PERMISSION,
            ],
            reservedPermissions: [
                CORE_PERMISSION.WORKSPACE_OWNERSHIP_TRANSFER,
            ],
            systemRolePermissions: {
                owner: [APP_PERMISSION],
                admin: [APP_PERMISSION],
            },
        });

        const updateManySpy = vi
            .spyOn(Role.collection, 'updateMany')
            .mockResolvedValueOnce({
                matchedCount: 2,
                modifiedCount: 2,
            })
            .mockResolvedValueOnce({
                matchedCount: 2,
                modifiedCount: 1,
            });

        const result =
            await backfillRegisteredSystemRolePermissions({
                permissionRegistry,
            });

        expect(updateManySpy).toHaveBeenCalledTimes(2);

        expect(updateManySpy).toHaveBeenNthCalledWith(
            1,
            {
                isSystem: true,
                key: 'owner',
            },
            {
                $addToSet: {
                    permissions: {
                        $each: [APP_PERMISSION],
                    },
                },
            },
        );

        expect(updateManySpy).toHaveBeenNthCalledWith(
            2,
            {
                isSystem: true,
                key: 'admin',
            },
            {
                $addToSet: {
                    permissions: {
                        $each: [APP_PERMISSION],
                    },
                },
            },
        );

        expect(result).toEqual({
            matchedRoles: 4,
            updatedRoles: 3,
        });
    });

    it('ne touche aucun rôle lorsque le registre ne déclare aucune extension système', async () => {
        const permissionRegistry = createRolePermissionRegistry({
            permissions: Object.values(CORE_PERMISSION),
            reservedPermissions: [
                CORE_PERMISSION.WORKSPACE_OWNERSHIP_TRANSFER,
            ],
        });

        const updateManySpy = vi.spyOn(
            Role.collection,
            'updateMany',
        );

        const result =
            await backfillRegisteredSystemRolePermissions({
                permissionRegistry,
            });

        expect(updateManySpy).not.toHaveBeenCalled();
        expect(result).toEqual({
            matchedRoles: 0,
            updatedRoles: 0,
        });
    });
});
