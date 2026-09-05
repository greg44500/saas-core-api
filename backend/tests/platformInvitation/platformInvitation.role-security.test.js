import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    PLATFORM_PERMISSION,
} from '../../constants/platformPermissions.constants.js';
import { PLATFORM_ROLE } from '../../constants/platformRoles.constants.js';
import {
    PLATFORM_ROLE_STATUS,
    PLATFORM_TEAM_ROLE_KEY,
} from '../../constants/platformTeam.constants.js';
import {
    assertAssignablePlatformRole,
} from '../../modules/platformInvitation/platformInvitation.service.js';


const activeRole = (overrides = {}) => ({
    key: PLATFORM_TEAM_ROLE_KEY.TECHNICAL_SUPPORT,
    status: PLATFORM_ROLE_STATUS.ACTIVE,
    permissions: [PLATFORM_PERMISSION.USERS_READ],
    ...overrides,
});


describe('assertAssignablePlatformRole', () => {
    it('refuse un rôle archivé', () => {
        expect(() => assertAssignablePlatformRole({
            role: activeRole({
                status: PLATFORM_ROLE_STATUS.ARCHIVED,
            }),
            actorPlatformRole: PLATFORM_ROLE.SUPER_ADMIN,
        })).toThrow(
            'Le rôle de Plateforme sélectionné n’est pas assignable.',
        );
    });

    it('refuse une permission absente du registre actif', () => {
        expect(() => assertAssignablePlatformRole({
            role: activeRole({
                permissions: ['platform:unknown:write'],
            }),
            actorPlatformRole: PLATFORM_ROLE.SUPER_ADMIN,
        })).toThrow(
            'Le rôle de Plateforme contient une permission inconnue.',
        );
    });

    it('refuse une permission réservée sur un rôle ordinaire', () => {
        expect(() => assertAssignablePlatformRole({
            role: activeRole({
                permissions: [
                    PLATFORM_PERMISSION.SUPER_ADMINS_MANAGE,
                ],
            }),
            actorPlatformRole: PLATFORM_ROLE.SUPER_ADMIN,
        })).toThrow(
            'Ce rôle de Plateforme contient une permission réservée.',
        );
    });

    it('refuse une invitation Super administrateur par un acteur non super-admin', () => {
        expect(() => assertAssignablePlatformRole({
            role: activeRole({
                key: PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
                permissions: [
                    PLATFORM_PERMISSION.SUPER_ADMINS_MANAGE,
                ],
            }),
            actorPlatformRole: PLATFORM_ROLE.ADMIN,
        })).toThrow(
            'Seul un Super administrateur peut inviter un autre Super administrateur.',
        );
    });

    it('autorise le rôle Super administrateur pour un super-admin', () => {
        expect(() => assertAssignablePlatformRole({
            role: activeRole({
                key: PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
                permissions: [
                    PLATFORM_PERMISSION.SUPER_ADMINS_MANAGE,
                ],
            }),
            actorPlatformRole: PLATFORM_ROLE.SUPER_ADMIN,
        })).not.toThrow();
    });
});
