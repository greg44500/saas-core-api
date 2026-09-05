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
    createAuthorizePlatformPermission,
} from '../../middlewares/authorizePlatformPermission.js';


describe('authorizePlatformPermission', () => {
    it('autorise lorsque le resolver runtime expose la permission requise', async () => {
        const authorizationResolver = vi.fn().mockResolvedValue({
            permissions: [PLATFORM_PERMISSION.PLANS_UPDATE],
        });
        const authorize = createAuthorizePlatformPermission({
            authorizationResolver,
        });
        const next = vi.fn();
        const req = {
            user: { _id: 'user-id' },
        };

        await authorize(
            PLATFORM_PERMISSION.PLANS_UPDATE,
        )(req, {}, next);

        expect(authorizationResolver).toHaveBeenCalledWith({
            user: req.user,
        });
        expect(next).toHaveBeenCalledWith();
        expect(req.platformAuthorization).toEqual({
            permissions: [PLATFORM_PERMISSION.PLANS_UPDATE],
        });
    });

    it('refuse lorsque la permission courante a été retirée', async () => {
        const authorize = createAuthorizePlatformPermission({
            authorizationResolver: vi.fn().mockResolvedValue({
                permissions: [],
            }),
        });
        const next = vi.fn();

        await authorize(
            PLATFORM_PERMISSION.PLANS_READ,
        )(
            { user: { _id: 'user-id' } },
            {},
            next,
        );

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 403 }),
        );
    });

    it('refuse par défaut un contexte utilisateur absent', async () => {
        const authorize = createAuthorizePlatformPermission({
            authorizationResolver: vi.fn(),
        });
        const next = vi.fn();

        await authorize(
            PLATFORM_PERMISSION.CAPABILITIES_READ,
        )({}, {}, next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ statusCode: 403 }),
        );
    });

    it('refuse de construire un middleware avec une permission inconnue', () => {
        const authorize = createAuthorizePlatformPermission({
            authorizationResolver: vi.fn(),
        });

        expect(() => authorize(
            'platform:features:create',
        )).toThrow(TypeError);
    });

    it('conserve une politique injectée pour les tests et compatibilités ciblées', async () => {
        const customAuthorize = createAuthorizePlatformPermission({
            rolePermissions: {
                [PLATFORM_ROLE.SUPPORT]: [
                    PLATFORM_PERMISSION.CAPABILITIES_READ,
                ],
            },
        });
        const next = vi.fn();

        await customAuthorize(
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

    it('accepte une permission ajoutée par une application dérivée lorsque le resolver la fournit', async () => {
        const derivedPermission = 'platform:catalog:read';
        const customAuthorize = createAuthorizePlatformPermission({
            knownPermissions: [derivedPermission],
            authorizationResolver: vi.fn().mockResolvedValue({
                permissions: [derivedPermission],
            }),
        });
        const next = vi.fn();

        await customAuthorize(derivedPermission)(
            { user: { _id: 'user-id' } },
            {},
            next,
        );

        expect(next).toHaveBeenCalledWith();
    });
});
