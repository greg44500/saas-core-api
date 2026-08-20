import mongoose from 'mongoose';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../constants/auditActions.constants.js';
import {
    SYSTEM_ROLE_KEY,
} from '../../../constants/role.constants.js';
import {
    createAuditLog,
} from '../../../modules/auditLog/auditLog.service.js';
import {
    createSystemRolesForWorkspace,
} from '../../../modules/role/role.service.js';
import {
    createFreeSubscriptionForWorkspace,
} from '../../../modules/subscriptions/subscription.service.js';
import {
    Workspace,
} from '../../../modules/workspace/workspace.model.js';
import {
    createWorkspace,
} from '../../../modules/workspace/workspace.service.js';
import {
    WorkspaceMember,
} from '../../../modules/workspaceMember/workspaceMember.model.js';


vi.mock('mongoose', () => ({
    default: {
        connection: {
            transaction: vi.fn(),
        },
    },
}));

vi.mock('../../../modules/auditLog/auditLog.service.js', () => ({
    createAuditLog: vi.fn(),
}));

vi.mock('../../../modules/role/role.model.js', () => ({
    Role: {
        collection: {
            name: 'roles',
        },
    },
}));

vi.mock('../../../modules/users/user.model.js', () => ({
    User: {
        collection: {
            name: 'users',
        },
    },
}));

vi.mock('../../../modules/role/role.service.js', () => ({
    createSystemRolesForWorkspace: vi.fn(),
}));

vi.mock(
    '../../../modules/subscriptions/subscription.service.js',
    () => ({
        createFreeSubscriptionForWorkspace:
            vi.fn(),
    }),
);

vi.mock('../../../modules/workspace/workspace.model.js', () => ({
    Workspace: {
        create: vi.fn(),
    },
}));

vi.mock(
    '../../../modules/workspaceMember/workspaceMember.model.js',
    () => ({
        WorkspaceMember: {
            create: vi.fn(),
        },
    }),
);


function prepareWorkspaceCreation() {
    const session = {
        id: 'mongo-session',
    };

    const workspace = {
        _id: 'workspace-id',
        name: 'Acme',
    };

    mongoose.connection.transaction
        .mockImplementation(
            async (callback) => callback(session),
        );

    Workspace.create.mockResolvedValue([
        workspace,
    ]);

    createSystemRolesForWorkspace.mockResolvedValue([
        {
            _id: 'owner-role-id',
            key: SYSTEM_ROLE_KEY.OWNER,
        },
    ]);

    WorkspaceMember.create.mockResolvedValue([
        {
            _id: 'membership-id',
        },
    ]);

    createFreeSubscriptionForWorkspace
        .mockResolvedValue({
            _id: 'subscription-id',
        });

    createAuditLog.mockResolvedValue(undefined);

    return {
        session,
        workspace,
    };
}


describe('createWorkspace audit', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });


    it('audite la création dans la transaction', async () => {
        const {
            session,
            workspace,
        } = prepareWorkspaceCreation();

        await createWorkspace({
            name: 'Acme',
            actorId: 'actor-id',
            ipAddress: '127.0.0.1',
            userAgent:
                'Mozilla/5.0 Test Browser',
        });

        expect(createAuditLog).toHaveBeenCalledWith(
            {
                actor: 'actor-id',
                workspace: workspace._id,
                action:
                    AUDIT_ACTION
                        .WORKSPACE_CREATED,
                entityType:
                    AUDIT_ENTITY_TYPE.WORKSPACE,
                entityId: workspace._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress: '127.0.0.1',
                userAgent:
                    'Mozilla/5.0 Test Browser',
            },
            {
                session,
            },
        );
    });


    it('propage l’échec de l’audit', async () => {
        prepareWorkspaceCreation();

        const auditError = new Error(
            'AuditLog persistence failed',
        );

        createAuditLog.mockRejectedValue(
            auditError,
        );

        await expect(
            createWorkspace({
                name: 'Acme',
                actorId: 'actor-id',
                ipAddress: '127.0.0.1',
                userAgent:
                    'Mozilla/5.0 Test Browser',
            }),
        ).rejects.toBe(auditError);
    });
});