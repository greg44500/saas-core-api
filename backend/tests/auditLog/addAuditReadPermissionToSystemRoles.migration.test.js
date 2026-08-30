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
    migrateAuditReadPermissionToSystemRoles,
} from '../../migrations/addAuditReadPermissionToSystemRoles.migration.js';
import { Role } from '../../modules/role/role.model.js';

beforeEach(() => {
    vi.restoreAllMocks();
});

describe('migrateAuditReadPermissionToSystemRoles', () => {
    it('ajoute idempotemment audit:read aux rôles owner et admin système', async () => {
        const updateManySpy = vi
            .spyOn(Role.collection, 'updateMany')
            .mockResolvedValue({
                matchedCount: 4,
                modifiedCount: 2,
            });

        const result =
            await migrateAuditReadPermissionToSystemRoles();

        expect(updateManySpy).toHaveBeenCalledWith(
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
                    permissions: CORE_PERMISSION.AUDIT_READ,
                },
            },
        );

        expect(result).toEqual({
            matchedRoles: 4,
            updatedRoles: 2,
        });
    });
});
