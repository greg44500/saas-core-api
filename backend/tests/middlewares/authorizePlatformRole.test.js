import {
    describe,
    expect,
    it,
    vi
} from 'vitest';

import { PLATFORM_ROLE } from '../../constants/platformRoles.constants.js';
import { authorizePlatformRole } from '../../middlewares/authorizePlatformRole.js';


describe('authorizePlatformRole', () => {
    it('autorise un utilisateur possédant un rôle plateforme accepté', () => {
        const req = {
            user: {
                platformRole: PLATFORM_ROLE.SUPER_ADMIN,
            },
        };

        const res = {};
        const next = vi.fn();

        const middleware = authorizePlatformRole(
            PLATFORM_ROLE.SUPER_ADMIN,
        );

        middleware(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(next).toHaveBeenCalledWith();
    });

    it('refuse un utilisateur possédant un rôle plateforme non autorisé', () => {
        const req = {
            user: {
                platformRole: PLATFORM_ROLE.USER,
            },
        };

        const res = {};
        const next = vi.fn();

        const middleware = authorizePlatformRole(
            PLATFORM_ROLE.SUPER_ADMIN,
        );

        middleware(req, res, next);

        expect(next).toHaveBeenCalledOnce();

        const [error] = next.mock.calls[0];

        expect(error).toMatchObject({
            statusCode: 403,
            message: 'Accès plateforme non autorisé',
        });
    });

    it('refuse lorsque le contexte utilisateur est absent', () => {
        const req = {};
        const res = {};
        const next = vi.fn();

        const middleware = authorizePlatformRole(
            PLATFORM_ROLE.SUPER_ADMIN,
        );

        middleware(req, res, next);

        expect(next).toHaveBeenCalledOnce();

        const [error] = next.mock.calls[0];

        expect(error).toMatchObject({
            statusCode: 403,
            message: 'Contexte utilisateur indisponible',
        });
    });
});