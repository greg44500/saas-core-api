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

const getSystemRole = (key) =>
    SYSTEM_ROLE_DEFINITIONS.find((role) => role.key === key);

describe('workspace subscription read permission', () => {
    it('est accordée par défaut uniquement aux rôles owner et admin', () => {
        expect(
            getSystemRole(SYSTEM_ROLE_KEY.OWNER).permissions,
        ).toContain(CORE_PERMISSION.SUBSCRIPTION_READ);
        expect(
            getSystemRole(SYSTEM_ROLE_KEY.ADMIN).permissions,
        ).toContain(CORE_PERMISSION.SUBSCRIPTION_READ);

        expect(
            getSystemRole(SYSTEM_ROLE_KEY.MANAGER).permissions,
        ).not.toContain(CORE_PERMISSION.SUBSCRIPTION_READ);
        expect(
            getSystemRole(SYSTEM_ROLE_KEY.MEMBER).permissions,
        ).not.toContain(CORE_PERMISSION.SUBSCRIPTION_READ);
        expect(
            getSystemRole(SYSTEM_ROLE_KEY.READER).permissions,
        ).not.toContain(CORE_PERMISSION.SUBSCRIPTION_READ);
    });
});