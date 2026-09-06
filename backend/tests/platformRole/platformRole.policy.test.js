import { describe, expect, it } from 'vitest';

import {
    PLATFORM_PERMISSION,
    PLATFORM_PERMISSION_SENSITIVITY,
} from '../../constants/platformPermissions.constants.js';
import {
    PLATFORM_ROLE_STATUS,
    PLATFORM_TEAM_ROLE_KEY,
} from '../../constants/platformTeam.constants.js';
import {
    assertCustomPlatformRoleIsMutable,
    assertCustomPlatformRolePermissions,
    getPlatformRolePermissionCatalog,
} from '../../modules/platformRole/platformRole.policy.js';


const platformAdminAuthorization = {
    roleKey: PLATFORM_TEAM_ROLE_KEY.PLATFORM_ADMIN,
    permissions: [
        PLATFORM_PERMISSION.OVERVIEW_READ,
        PLATFORM_PERMISSION.USERS_READ,
        PLATFORM_PERMISSION.ROLES_CREATE,
        PLATFORM_PERMISSION.ROLES_UPDATE,
    ],
};

const superAdminAuthorization = {
    roleKey: PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
    permissions: Object.values(PLATFORM_PERMISSION),
};


describe('platformRole policy', () => {
    it('autorise un acteur ordinaire à définir uniquement un sous-ensemble strict de ses droits', () => {
        expect(assertCustomPlatformRolePermissions({
            authorization: platformAdminAuthorization,
            permissions: [
                PLATFORM_PERMISSION.OVERVIEW_READ,
                PLATFORM_PERMISSION.USERS_READ,
            ],
        })).toEqual([
            PLATFORM_PERMISSION.OVERVIEW_READ,
            PLATFORM_PERMISSION.USERS_READ,
        ]);

        expect(() => assertCustomPlatformRolePermissions({
            authorization: platformAdminAuthorization,
            permissions: platformAdminAuthorization.permissions,
        })).toThrow(/strictement inférieurs/i);
    });

    it('refuse une permission que l’acteur non-Superadmin ne possède pas', () => {
        expect(() => assertCustomPlatformRolePermissions({
            authorization: platformAdminAuthorization,
            permissions: [
                PLATFORM_PERMISSION.SUBSCRIPTIONS_CANCEL,
            ],
        })).toThrow(/strictement inférieurs/i);
    });

    it('refuse une permission réservée même dans un rôle créé par un Super administrateur', () => {
        expect(() => assertCustomPlatformRolePermissions({
            authorization: superAdminAuthorization,
            permissions: [
                PLATFORM_PERMISSION.SUPER_ADMINS_MANAGE,
            ],
        })).toThrow(/permission réservée/i);
    });

    it('refuse une permission absente du registre actif', () => {
        expect(() => assertCustomPlatformRolePermissions({
            authorization: superAdminAuthorization,
            permissions: [
                'platform:unknown:power',
            ],
        })).toThrow(/registre Platform actif/i);
    });

    it('protège les rôles système et les rôles archivés contre les mutations ordinaires', () => {
        expect(() => assertCustomPlatformRoleIsMutable({
            authorization: superAdminAuthorization,
            role: {
                isSystem: true,
                status: PLATFORM_ROLE_STATUS.ACTIVE,
                key: PLATFORM_TEAM_ROLE_KEY.TECHNICAL_SUPPORT,
                permissions: [PLATFORM_PERMISSION.OVERVIEW_READ],
            },
        })).toThrow(/rôle système/i);

        expect(() => assertCustomPlatformRoleIsMutable({
            authorization: superAdminAuthorization,
            role: {
                isSystem: false,
                status: PLATFORM_ROLE_STATUS.ARCHIVED,
                key: 'custom_archived',
                permissions: [PLATFORM_PERMISSION.OVERVIEW_READ],
            },
        })).toThrow(/archivé/i);
    });

    it('expose un catalogue code-owned avec les permissions réservées non assignables', () => {
        const catalog = getPlatformRolePermissionCatalog({
            authorization: superAdminAuthorization,
        });
        const reserved = catalog.find(
            ({ key }) => key === PLATFORM_PERMISSION.SUPER_ADMINS_MANAGE,
        );
        const overview = catalog.find(
            ({ key }) => key === PLATFORM_PERMISSION.OVERVIEW_READ,
        );

        expect(reserved).toMatchObject({
            sensitivity: PLATFORM_PERMISSION_SENSITIVITY.RESERVED,
            assignable: false,
        });
        expect(overview).toMatchObject({ assignable: true });
    });
});
