import {
    afterEach,
    describe,
    expect,
    it,
} from 'vitest';

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import {
    DEFAULT_ROLE_PERMISSION_REGISTRY,
    configureRolePermissionRegistry,
    createRolePermissionRegistry,
    getActiveRolePermissionRegistry,
} from '../../modules/role/rolePermission.registry.js';


const APP_PERMISSION = 'catalog:item:read';


describe('rolePermission.registry', () => {
    afterEach(() => {
        configureRolePermissionRegistry(
            DEFAULT_ROLE_PERMISSION_REGISTRY,
        );
    });

    it('conserve toutes les permissions Core dans le registre par défaut', () => {
        expect(DEFAULT_ROLE_PERMISSION_REGISTRY.permissions).toEqual(
            expect.arrayContaining(
                Object.values(CORE_PERMISSION),
            ),
        );

        expect(
            DEFAULT_ROLE_PERMISSION_REGISTRY.reservedPermissions,
        ).toContain(
            CORE_PERMISSION.WORKSPACE_OWNERSHIP_TRANSFER,
        );
    });

    it('accepte une extension applicative et normalise les doublons', () => {
        const registry = createRolePermissionRegistry({
            permissions: [
                ...Object.values(CORE_PERMISSION),
                APP_PERMISSION,
                ` ${APP_PERMISSION.toUpperCase()} `,
            ],
            reservedPermissions: [
                CORE_PERMISSION.WORKSPACE_OWNERSHIP_TRANSFER,
            ],
            systemRolePermissions: {
                owner: [APP_PERMISSION],
                admin: [APP_PERMISSION, APP_PERMISSION],
            },
        });

        expect(
            registry.permissions.filter(
                (permission) => permission === APP_PERMISSION,
            ),
        ).toHaveLength(1);

        expect(registry.systemRolePermissions).toEqual({
            admin: [APP_PERMISSION],
            owner: [APP_PERMISSION],
        });
    });

    it('refuse une permission système qui n’est pas enregistrée', () => {
        expect(() => createRolePermissionRegistry({
            permissions: Object.values(CORE_PERMISSION),
            reservedPermissions: [
                CORE_PERMISSION.WORKSPACE_OWNERSHIP_TRANSFER,
            ],
            systemRolePermissions: {
                owner: [APP_PERMISSION],
            },
        })).toThrow(
            `System role permission is not registered: ${APP_PERMISSION}`,
        );
    });

    it('refuse une permission réservée absente du registre actif', () => {
        expect(() => createRolePermissionRegistry({
            permissions: Object.values(CORE_PERMISSION),
            reservedPermissions: [APP_PERMISSION],
        })).toThrow(
            `Reserved permission is not registered: ${APP_PERMISSION}`,
        );
    });

    it('permet de configurer explicitement le registre runtime actif', () => {
        const registry = createRolePermissionRegistry({
            permissions: [
                ...Object.values(CORE_PERMISSION),
                APP_PERMISSION,
            ],
            reservedPermissions: [
                CORE_PERMISSION.WORKSPACE_OWNERSHIP_TRANSFER,
            ],
        });

        configureRolePermissionRegistry(registry);

        expect(getActiveRolePermissionRegistry()).toBe(registry);
    });
});
