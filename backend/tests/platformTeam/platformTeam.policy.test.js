import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    PLATFORM_PERMISSION,
} from '../../constants/platformPermissions.constants.js';
import {
    PLATFORM_ROLE_STATUS,
    PLATFORM_TEAM_ROLE_KEY,
} from '../../constants/platformTeam.constants.js';
import {
    assertActorCanAssignRole,
    assertActorCanManageMember,
} from '../../modules/platformTeam/platformTeam.service.js';


const activeRole = ({
    key,
    permissions,
}) => ({
    _id: `${key}-id`,
    key,
    status: PLATFORM_ROLE_STATUS.ACTIVE,
    permissions,
});

const platformAdminAuthorization = {
    roleKey: PLATFORM_TEAM_ROLE_KEY.PLATFORM_ADMIN,
    permissions: [
        PLATFORM_PERMISSION.USERS_READ,
        PLATFORM_PERMISSION.WORKSPACES_READ,
        PLATFORM_PERMISSION.TEAM_READ,
        PLATFORM_PERMISSION.TEAM_INVITE,
        PLATFORM_PERMISSION.TEAM_MEMBER_ROLE_UPDATE,
        PLATFORM_PERMISSION.TEAM_MEMBER_SUSPEND,
    ],
};


describe('Platform Team delegation policy', () => {
    it('interdit toute mutation ordinaire du Fondateur', () => {
        expect(() => assertActorCanManageMember({
            actorId: 'actor-id',
            authorization: {
                roleKey: PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
                permissions: [],
            },
            targetMember: {
                user: 'founder-user-id',
                isFounder: true,
            },
            targetRole: activeRole({
                key: PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
                permissions: [],
            }),
        })).toThrow(
            expect.objectContaining({ statusCode: 403 }),
        );
    });

    it('interdit de modifier sa propre appartenance Platform', () => {
        expect(() => assertActorCanManageMember({
            actorId: 'same-user-id',
            authorization: platformAdminAuthorization,
            targetMember: {
                user: 'same-user-id',
                isFounder: false,
            },
            targetRole: activeRole({
                key: PLATFORM_TEAM_ROLE_KEY.CUSTOMER_SUPPORT,
                permissions: [PLATFORM_PERMISSION.USERS_READ],
            }),
        })).toThrow(
            expect.objectContaining({ statusCode: 403 }),
        );
    });

    it('autorise un administrateur à gérer un rôle strictement inférieur', () => {
        expect(() => assertActorCanManageMember({
            actorId: 'admin-user-id',
            authorization: platformAdminAuthorization,
            targetMember: {
                user: 'support-user-id',
                isFounder: false,
            },
            targetRole: activeRole({
                key: PLATFORM_TEAM_ROLE_KEY.CUSTOMER_SUPPORT,
                permissions: [
                    PLATFORM_PERMISSION.USERS_READ,
                    PLATFORM_PERMISSION.WORKSPACES_READ,
                ],
            }),
        })).not.toThrow();
    });

    it('interdit à un administrateur de gérer un pair de même niveau', () => {
        expect(() => assertActorCanManageMember({
            actorId: 'admin-1',
            authorization: platformAdminAuthorization,
            targetMember: {
                user: 'admin-2',
                isFounder: false,
            },
            targetRole: activeRole({
                key: PLATFORM_TEAM_ROLE_KEY.PLATFORM_ADMIN,
                permissions: [...platformAdminAuthorization.permissions],
            }),
        })).toThrow(
            expect.objectContaining({ statusCode: 403 }),
        );
    });

    it('interdit à un acteur ordinaire d’attribuer Super administrateur', () => {
        expect(() => assertActorCanAssignRole({
            authorization: platformAdminAuthorization,
            role: activeRole({
                key: PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
                permissions: [],
            }),
        })).toThrow(
            expect.objectContaining({ statusCode: 403 }),
        );
    });

    it('autorise un Super administrateur à attribuer un rôle valide', () => {
        expect(() => assertActorCanAssignRole({
            authorization: {
                roleKey: PLATFORM_TEAM_ROLE_KEY.SUPER_ADMIN,
                permissions: [],
            },
            role: activeRole({
                key: PLATFORM_TEAM_ROLE_KEY.TECHNICAL_SUPPORT,
                permissions: [PLATFORM_PERMISSION.USERS_READ],
            }),
        })).not.toThrow();
    });
});
