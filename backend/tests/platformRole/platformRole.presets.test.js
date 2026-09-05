import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    PLATFORM_PERMISSION,
    PLATFORM_PERMISSION_SENSITIVITY,
} from '../../constants/platformPermissions.constants.js';
import {
    PLATFORM_TEAM_ROLE_KEY,
} from '../../constants/platformTeam.constants.js';
import {
    ACTIVE_PLATFORM_PERMISSION_REGISTRY,
} from '../../config/applicationPlatformPermission.registry.js';
import {
    PLATFORM_ADMIN_PERMISSIONS,
    SYSTEM_PLATFORM_ROLE_PRESETS,
} from '../../modules/platformRole/platformRole.presets.js';


describe('system PlatformRole presets', () => {
    it('fournit les cinq rôles système attendus', () => {
        expect(
            SYSTEM_PLATFORM_ROLE_PRESETS.map(({ key }) => key),
        ).toEqual([
            PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
            PLATFORM_TEAM_ROLE_KEY.PLATFORM_ADMIN,
            PLATFORM_TEAM_ROLE_KEY.TECHNICAL_SUPPORT,
            PLATFORM_TEAM_ROLE_KEY.COMMERCIAL_SUPPORT,
            PLATFORM_TEAM_ROLE_KEY.CUSTOMER_SUPPORT,
        ]);
    });

    it('donne au super-admin toutes les permissions assignables du registre actif', () => {
        const superAdmin = SYSTEM_PLATFORM_ROLE_PRESETS.find(
            ({ key }) =>
                key === PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
        );

        expect(superAdmin.permissions).toEqual(
            ACTIVE_PLATFORM_PERMISSION_REGISTRY.definitions.map(
                ({ key }) => key,
            ),
        );
    });

    it('ne donne aucune permission réservée à l’administrateur de la Plateforme', () => {
        const reservedPermissions =
            ACTIVE_PLATFORM_PERMISSION_REGISTRY.definitions
                .filter(
                    ({ sensitivity }) =>
                        sensitivity
                        === PLATFORM_PERMISSION_SENSITIVITY.RESERVED,
                )
                .map(({ key }) => key);

        for (const permission of reservedPermissions) {
            expect(PLATFORM_ADMIN_PERMISSIONS).not.toContain(
                permission,
            );
        }
    });

    it('limite le support commercial au grant trial pour les mutations Subscription', () => {
        const commercialSupport =
            SYSTEM_PLATFORM_ROLE_PRESETS.find(
                ({ key }) =>
                    key
                    === PLATFORM_TEAM_ROLE_KEY.COMMERCIAL_SUPPORT,
            );

        expect(commercialSupport.permissions).toContain(
            PLATFORM_PERMISSION.SUBSCRIPTIONS_GRANT_TRIAL,
        );
        expect(commercialSupport.permissions).not.toContain(
            PLATFORM_PERMISSION.SUBSCRIPTIONS_UPDATE,
        );
        expect(commercialSupport.permissions).not.toContain(
            PLATFORM_PERMISSION.SUBSCRIPTIONS_CANCEL,
        );
        expect(commercialSupport.permissions).not.toContain(
            PLATFORM_PERMISSION.SUBSCRIPTIONS_RESUME,
        );
    });
});
