import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    PLATFORM_PERMISSION,
} from '../../constants/platformPermissions.constants.js';
import {
    PLATFORM_ROLE,
} from '../../constants/platformRoles.constants.js';
import {
    authorizePlatformPermission,
    createAuthorizePlatformPermission,
} from '../../middlewares/authorizePlatformPermission.js';


describe('authorizePlatformPermission', () => {
    it('autorise le super-admin pour une permission Platform connue', () => {
        const next = vi.fn();

        authorizePlatformPermission(
            PLATFORM_PERMISSION.PLANS_UPDATE,
        )(
            {
                user: {
                    platformRole: PLATFORM_ROLE.SUPER_ADMIN,
                },
            },
            {},
            next,
        );

        expect(next).toHaveBeenCalledWith();
    });

    it('autorise le super-admin à lire le cockpit Platform', () => {
        const next = vi.fn();

        authorizePlatformPermission(
            PLATFORM_PERMISSION.OVERVIEW_READ,
        )(
            {
                user: {
                    platformRole: PLATFORM_ROLE.SUPER_ADMIN,
                },
            },
            {},
            next,
        );

        expect(next).toHaveBeenCalledWith();
    });

    it('ne donne aucun droit implicite au rôle admin Core V1', () => {
        const next = vi.fn();

        authorizePlatformPermission(
            PLATFORM_PERMISSION.PLANS_READ,
        )(
            {
                user: {
                    platformRole: PLATFORM_ROLE.ADMIN,
                },
            },
            {},
            next,
        );

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 403,
            }),
        );
    });

    it('refuse par défaut un contexte utilisateur absent', () => {
        const next = vi.fn();

        authorizePlatformPermission(
            PLATFORM_PERMISSION.CAPABILITIES_READ,
        )({}, {}, next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: 403,
            }),
        );
    });

    it('refuse de construire un middleware avec une permission inconnue', () => {
        expect(() => authorizePlatformPermission(
            'platform:features:create',
        )).toThrow(TypeError);
    });

    it('permet une politique injectée sans modifier les routes', () => {
        const customAuthorize = createAuthorizePlatformPermission({
            rolePermissions: {
                [PLATFORM_ROLE.SUPPORT]: [
                    PLATFORM_PERMISSION.CAPABILITIES_READ,
                ],
            },
        });
        const next = vi.fn();

        customAuthorize(
            PLATFORM_PERMISSION.CAPABILITIES_READ,
        )(
            {
                user: {
                    platformRole: PLATFORM_ROLE.SUPPORT,
                },
            },
            {},
            next,
        );

        expect(next).toHaveBeenCalledWith();
    });
});
