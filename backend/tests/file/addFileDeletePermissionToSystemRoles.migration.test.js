import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import { SYSTEM_ROLE_KEY } from '../../constants/role.constants.js';
import {
    migrateFileDeletePermissionToSystemRoles,
} from '../../migrations/addFileDeletePermissionToSystemRoles.migration.js';
import { Role } from '../../modules/role/role.model.js';

vi.mock('../../modules/role/role.model.js', () => ({
    Role: {
        collection: {
            updateMany: vi.fn(),
        },
    },
}));

beforeEach(() => {
    vi.clearAllMocks();
});

describe('migrateFileDeletePermissionToSystemRoles', () => {
    it('ajoute file:delete uniquement aux rôles owner et admin', async () => {
        Role.collection.updateMany.mockResolvedValue({
            matchedCount: 4,
            modifiedCount: 4,
        });

        const result =
            await migrateFileDeletePermissionToSystemRoles();

        expect(Role.collection.updateMany).toHaveBeenCalledWith(
            {
                isSystem: true,
                key: {
                    $in: [
                        SYSTEM_ROLE_KEY.OWNER,
                        SYSTEM_ROLE_KEY.ADMIN,
                    ],
                },
            },
            {
                $addToSet: {
                    permissions: CORE_PERMISSION.FILE_DELETE,
                },
            },
        );

        expect(result).toEqual({
            matchedRoles: 4,
            updatedRoles: 4,
        });
    });
});
