import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    PLATFORM_PERMISSION,
} from '../../constants/platformPermissions.constants.js';
import {
    PLATFORM_TEAM_ROLE_KEY,
} from '../../constants/platformTeam.constants.js';
import {
    getPlatformRolePermissionCatalogForActor,
} from '../../modules/platformRole/platformRoleCatalog.service.js';
import {
    resolvePlatformAuthorization,
} from '../../modules/platformTeam/platformAuthorization.service.js';
import { User } from '../../modules/users/user.model.js';

vi.mock('../../modules/users/user.model.js', () => ({
    User: { findById: vi.fn() },
}));
vi.mock('../../modules/platformTeam/platformAuthorization.service.js', () => ({
    resolvePlatformAuthorization: vi.fn(),
}));

const actor = { _id: 'actor-user-id' };


describe('getPlatformRolePermissionCatalogForActor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        User.findById.mockResolvedValue(actor);
    });

    it('construit le catalogue à partir de l’autorité runtime courante', async () => {
        resolvePlatformAuthorization.mockResolvedValue({
            roleKey: PLATFORM_TEAM_ROLE_KEY.PLATFORM_ADMIN,
            permissions: [
                PLATFORM_PERMISSION.ROLES_READ,
                PLATFORM_PERMISSION.OVERVIEW_READ,
            ],
        });

        const catalog = await getPlatformRolePermissionCatalogForActor({
            actorId: actor._id,
        });
        const overview = catalog.find(
            ({ key }) => key === PLATFORM_PERMISSION.OVERVIEW_READ,
        );
        const usersRead = catalog.find(
            ({ key }) => key === PLATFORM_PERMISSION.USERS_READ,
        );
        const reserved = catalog.find(
            ({ key }) => key === PLATFORM_PERMISSION.SUPER_ADMINS_MANAGE,
        );

        expect(overview.assignable).toBe(true);
        expect(usersRead.assignable).toBe(false);
        expect(reserved.assignable).toBe(false);
        expect(resolvePlatformAuthorization).toHaveBeenCalledWith({
            user: actor,
        });
    });

    it('refuse le catalogue si roles:read a été retiré avant la requête', async () => {
        resolvePlatformAuthorization.mockResolvedValue({
            roleKey: PLATFORM_TEAM_ROLE_KEY.PLATFORM_ADMIN,
            permissions: [PLATFORM_PERMISSION.OVERVIEW_READ],
        });

        await expect(getPlatformRolePermissionCatalogForActor({
            actorId: actor._id,
        })).rejects.toMatchObject({ statusCode: 403 });
    });

    it('refuse un acteur devenu introuvable', async () => {
        User.findById.mockResolvedValue(null);

        await expect(getPlatformRolePermissionCatalogForActor({
            actorId: actor._id,
        })).rejects.toMatchObject({ statusCode: 403 });

        expect(resolvePlatformAuthorization).not.toHaveBeenCalled();
    });
});
