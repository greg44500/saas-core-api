import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    CORE_PERMISSION,
} from '../../constants/permissions.constants.js';

import {
    SYSTEM_ROLE_DEFINITIONS,
    SYSTEM_ROLE_KEY,
} from '../../constants/role.constants.js';


/**
 * Retourne la définition d'un rôle système sans dépendre de l'ordre du
 * registre. Les tests restent ainsi stables si la présentation des rôles
 * évolue ultérieurement.
 */
const getSystemRoleDefinition = (roleKey) =>
    SYSTEM_ROLE_DEFINITIONS.find(
        ({ key }) => key === roleKey,
    );


describe('System role permissions', () => {
    it('accorde file:upload aux rôles owner et admin', () => {
        const owner = getSystemRoleDefinition(
            SYSTEM_ROLE_KEY.OWNER,
        );

        const admin = getSystemRoleDefinition(
            SYSTEM_ROLE_KEY.ADMIN,
        );

        expect(owner.permissions).toContain(
            CORE_PERMISSION.FILE_UPLOAD,
        );

        expect(admin.permissions).toContain(
            CORE_PERMISSION.FILE_UPLOAD,
        );
    });

    it('n’accorde pas file:upload aux rôles manager, member et reader', () => {
        const restrictedRoleKeys = [
            SYSTEM_ROLE_KEY.MANAGER,
            SYSTEM_ROLE_KEY.MEMBER,
            SYSTEM_ROLE_KEY.READER,
        ];

        for (const roleKey of restrictedRoleKeys) {
            const role = getSystemRoleDefinition(roleKey);

            expect(role.permissions).not.toContain(
                CORE_PERMISSION.FILE_UPLOAD,
            );
        }
    });

    it('accorde file:read à tous les rôles système', () => {
        for (const role of SYSTEM_ROLE_DEFINITIONS) {
            expect(role.permissions).toContain(
                CORE_PERMISSION.FILE_READ,
            );
        }
    });

    it('réserve file:delete aux rôles owner et admin', () => {
        const privilegedRoleKeys = [
            SYSTEM_ROLE_KEY.OWNER,
            SYSTEM_ROLE_KEY.ADMIN,
        ];

        for (const roleKey of privilegedRoleKeys) {
            const role = getSystemRoleDefinition(roleKey);
            expect(role.permissions).toContain(
                CORE_PERMISSION.FILE_DELETE,
            );
        }

        const restrictedRoleKeys = [
            SYSTEM_ROLE_KEY.MANAGER,
            SYSTEM_ROLE_KEY.MEMBER,
            SYSTEM_ROLE_KEY.READER,
        ];

        for (const roleKey of restrictedRoleKeys) {
            const role = getSystemRoleDefinition(roleKey);
            expect(role.permissions).not.toContain(
                CORE_PERMISSION.FILE_DELETE,
            );
        }
    });

    it('réserve workspace:ownership:transfer au rôle owner', () => {
        const owner = getSystemRoleDefinition(
            SYSTEM_ROLE_KEY.OWNER,
        );

        expect(owner.permissions).toContain(
            CORE_PERMISSION.WORKSPACE_OWNERSHIP_TRANSFER,
        );

        const restrictedRoleKeys = [
            SYSTEM_ROLE_KEY.ADMIN,
            SYSTEM_ROLE_KEY.MANAGER,
            SYSTEM_ROLE_KEY.MEMBER,
            SYSTEM_ROLE_KEY.READER,
        ];

        for (const roleKey of restrictedRoleKeys) {
            const role = getSystemRoleDefinition(roleKey);

            expect(role.permissions).not.toContain(
                CORE_PERMISSION.WORKSPACE_OWNERSHIP_TRANSFER,
            );
        }
    });
});
