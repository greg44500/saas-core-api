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
    migrateMemberInvitePermissionToSystemRoles,
} from '../../migrations/addMemberInvitePermissionToSystemRoles.migration.js';
import { Role } from '../../modules/role/role.model.js';

vi.mock('../../modules/role/role.model.js', () => ({
    Role: {
        collection: {
            updateMany: vi.fn(),
        },
    },
}));

describe('migrateMemberInvitePermissionToSystemRoles', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('ajoute member:invite uniquement aux rôles owner et admin', async () => {
        Role.collection.updateMany.mockResolvedValue({
            matchedCount: 4,
            modifiedCount: 2,
        });

        const result =
            await migrateMemberInvitePermissionToSystemRoles();

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
                    permissions: CORE_PERMISSION.MEMBER_INVITE,
                },
            },
        );

        expect(result).toEqual({
            matchedRoles: 4,
            updatedRoles: 2,
        });
    });
});
