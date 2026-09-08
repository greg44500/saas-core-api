import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    ACTIVE_PLATFORM_PERMISSION_REGISTRY,
} from '../../config/applicationPlatformPermission.registry.js';
import {
    PLATFORM_PERMISSION,
    PLATFORM_PERMISSION_SENSITIVITY,
} from '../../constants/platformPermissions.constants.js';
import {
    PLATFORM_TEAM_ROLE_KEY,
} from '../../constants/platformTeam.constants.js';
import {
    PLATFORM_ADMIN_PERMISSIONS,
    SYSTEM_PLATFORM_ROLE_PRESETS,
} from '../../modules/platformRole/platformRole.presets.js';


const RETENTION_PERMISSION_KEYS = Object.freeze([
    PLATFORM_PERMISSION.RETENTION_READ,
    PLATFORM_PERMISSION.RETENTION_PREVIEW,
    PLATFORM_PERMISSION.RETENTION_UPDATE,
    PLATFORM_PERMISSION.RETENTION_EXECUTE,
]);

const getSensitivity = (permissionKey) =>
    ACTIVE_PLATFORM_PERMISSION_REGISTRY.definitions.find(
        ({ key }) => key === permissionKey,
    )?.sensitivity ?? null;


describe('D-019 Platform retention permissions', () => {
    it('classe read et preview en SENSITIVE', () => {
        expect(
            getSensitivity(PLATFORM_PERMISSION.RETENTION_READ),
        ).toBe(PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE);
        expect(
            getSensitivity(PLATFORM_PERMISSION.RETENTION_PREVIEW),
        ).toBe(PLATFORM_PERMISSION_SENSITIVITY.SENSITIVE);
    });

    it('classe update et execute en RESERVED', () => {
        expect(
            getSensitivity(PLATFORM_PERMISSION.RETENTION_UPDATE),
        ).toBe(PLATFORM_PERMISSION_SENSITIVITY.RESERVED);
        expect(
            getSensitivity(PLATFORM_PERMISSION.RETENTION_EXECUTE),
        ).toBe(PLATFORM_PERMISSION_SENSITIVITY.RESERVED);
    });

    it('donne seulement read et preview au platform_admin', () => {
        expect(PLATFORM_ADMIN_PERMISSIONS).toContain(
            PLATFORM_PERMISSION.RETENTION_READ,
        );
        expect(PLATFORM_ADMIN_PERMISSIONS).toContain(
            PLATFORM_PERMISSION.RETENTION_PREVIEW,
        );
        expect(PLATFORM_ADMIN_PERMISSIONS).not.toContain(
            PLATFORM_PERMISSION.RETENTION_UPDATE,
        );
        expect(PLATFORM_ADMIN_PERMISSIONS).not.toContain(
            PLATFORM_PERMISSION.RETENTION_EXECUTE,
        );
    });

    it('donne les quatre permissions au super_admin', () => {
        const superAdmin = SYSTEM_PLATFORM_ROLE_PRESETS.find(
            ({ key }) => key === PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
        );

        expect(superAdmin.permissions).toEqual(
            expect.arrayContaining(RETENTION_PERMISSION_KEYS),
        );
    });

    it('ne donne aucun droit de rétention aux rôles support par défaut', () => {
        const supportRoleKeys = [
            PLATFORM_TEAM_ROLE_KEY.TECHNICAL_SUPPORT,
            PLATFORM_TEAM_ROLE_KEY.COMMERCIAL_SUPPORT,
            PLATFORM_TEAM_ROLE_KEY.CUSTOMER_SUPPORT,
        ];

        for (const roleKey of supportRoleKeys) {
            const role = SYSTEM_PLATFORM_ROLE_PRESETS.find(
                ({ key }) => key === roleKey,
            );

            for (const permission of RETENTION_PERMISSION_KEYS) {
                expect(role.permissions).not.toContain(permission);
            }
        }
    });
});
