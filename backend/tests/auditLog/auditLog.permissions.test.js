import {
    describe,
    expect,
    it,
} from 'vitest';

import { CORE_PERMISSION } from '../../constants/permissions.constants.js';
import {
    SYSTEM_ROLE_DEFINITIONS,
    SYSTEM_ROLE_KEY,
} from '../../constants/role.constants.js';


const getRoleDefinition = (roleKey) => {
    return SYSTEM_ROLE_DEFINITIONS.find(
        (definition) => definition.key === roleKey,
    );
};


describe('AuditLog workspace permissions', () => {
    it('accorde audit:read uniquement aux rôles système d’administration', () => {
        const ownerRole = getRoleDefinition(SYSTEM_ROLE_KEY.OWNER);
        const adminRole = getRoleDefinition(SYSTEM_ROLE_KEY.ADMIN);
        const managerRole = getRoleDefinition(SYSTEM_ROLE_KEY.MANAGER);
        const memberRole = getRoleDefinition(SYSTEM_ROLE_KEY.MEMBER);
        const readerRole = getRoleDefinition(SYSTEM_ROLE_KEY.READER);

        expect(ownerRole.permissions).toContain(
            CORE_PERMISSION.AUDIT_READ,
        );
        expect(adminRole.permissions).toContain(
            CORE_PERMISSION.AUDIT_READ,
        );

        expect(managerRole.permissions).not.toContain(
            CORE_PERMISSION.AUDIT_READ,
        );
        expect(memberRole.permissions).not.toContain(
            CORE_PERMISSION.AUDIT_READ,
        );
        expect(readerRole.permissions).not.toContain(
            CORE_PERMISSION.AUDIT_READ,
        );
    });
});
