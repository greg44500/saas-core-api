import {
    describe,
    expect,
    it,
} from 'vitest';

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import {
    createSystemRoleDefinitions,
} from '../../constants/role.constants.js';
import {
    composeRolePermissionExtensions,
    createRolePermissionRegistry,
} from '../../modules/role/rolePermission.registry.js';


const CATALOG_READ = 'catalog:item:read';
const CATALOG_UPDATE = 'catalog:item:update';


describe('application RBAC composition', () => {
    it('enregistre les permissions métier et enrichit explicitement les rôles système', () => {
        const extensions = composeRolePermissionExtensions([
            {
                permissions: [
                    CATALOG_READ,
                    CATALOG_UPDATE,
                ],
                systemRolePermissions: {
                    owner: [CATALOG_READ, CATALOG_UPDATE],
                    admin: [CATALOG_READ, CATALOG_UPDATE],
                    member: [CATALOG_READ],
                },
            },
        ]);

        const registry = createRolePermissionRegistry({
            permissions: [
                ...Object.values(CORE_PERMISSION),
                ...extensions.permissions,
            ],
            reservedPermissions: [
                CORE_PERMISSION.WORKSPACE_OWNERSHIP_TRANSFER,
                ...extensions.reservedPermissions,
            ],
            systemRolePermissions: extensions.systemRolePermissions,
        });

        const roleDefinitions = createSystemRoleDefinitions({
            permissionExtensionsByRole:
                registry.systemRolePermissions,
        });

        expect(registry.permissions).toContain(CATALOG_READ);
        expect(registry.permissions).toContain(CATALOG_UPDATE);

        expect(
            roleDefinitions.find(({ key }) => key === 'owner').permissions,
        ).toEqual(expect.arrayContaining([
            CATALOG_READ,
            CATALOG_UPDATE,
        ]));
        expect(
            roleDefinitions.find(({ key }) => key === 'admin').permissions,
        ).toEqual(expect.arrayContaining([
            CATALOG_READ,
            CATALOG_UPDATE,
        ]));
        expect(
            roleDefinitions.find(({ key }) => key === 'member').permissions,
        ).toContain(CATALOG_READ);
    });

    it('refuse une collision de permission entre deux modules métier', () => {
        expect(() => composeRolePermissionExtensions([
            {
                permissions: [CATALOG_READ],
            },
            {
                permissions: [CATALOG_READ],
            },
        ])).toThrow(
            `Duplicate application permission declaration: ${CATALOG_READ}`,
        );
    });

    it('refuse d’accorder à un rôle une permission non déclarée par son module', () => {
        expect(() => composeRolePermissionExtensions([
            {
                permissions: [CATALOG_READ],
                systemRolePermissions: {
                    owner: [CATALOG_UPDATE],
                },
            },
        ])).toThrow(
            `System role permission is not declared by its module: ${CATALOG_UPDATE}`,
        );
    });
});
