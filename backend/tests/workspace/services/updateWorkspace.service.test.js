import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../constants/auditActions.constants.js';

import {
    WORKSPACE_STATUS,
} from '../../../constants/workspace.constants.js';

import {
    createAuditLog,
} from '../../../modules/auditLog/auditLog.service.js';

import { Workspace } from '../../../modules/workspace/workspace.model.js';

import {
    updateWorkspace,
} from '../../../modules/workspace/workspace.service.js';


vi.mock(
    '../../../modules/auditLog/auditLog.service.js',
    () => ({
        createAuditLog: vi.fn(),
    }),
);

vi.mock('mongoose', () => {
    const ObjectId = vi.fn(function (value) {
        return {
            value,
        };
    });

    return {
        default: {
            connection: {
                transaction: vi.fn(),
            },
            Types: {
                ObjectId,
            },
        },
    };
});
vi.mock(
    '../../../modules/role/role.service.js',
    () => ({
        createSystemRolesForWorkspace: vi.fn(),
    }),
);

vi.mock(
    '../../../modules/subscriptions/subscription.service.js',
    () => ({
        createFreeSubscriptionForWorkspace: vi.fn(),
    }),
);

vi.mock(
    '../../../modules/role/role.model.js',
    () => ({
        Role: {
            collection: {
                name: 'roles',
            },
        },
    }),
);

vi.mock(
    '../../../modules/users/user.model.js',
    () => ({
        User: {
            collection: {
                name: 'users',
            },
        },
    }),
);

vi.mock(
    '../../../modules/workspaceMember/workspaceMember.model.js',
    () => ({
        WorkspaceMember: {
            aggregate: vi.fn(),
            create: vi.fn(),
            find: vi.fn(),
        },
    }),
);

vi.mock(
    '../../../modules/workspace/workspace.model.js',
    () => ({
        Workspace: {
            findOneAndUpdate: vi.fn(),
        },
    }),
);


describe('updateWorkspace', () => {
    const session = {
        id: 'mongo-session',
    };

    beforeEach(() => {
        vi.clearAllMocks();

        mongoose.connection.transaction
            .mockImplementation(
                async (callback) =>
                    callback(session),
            );

        createAuditLog
            .mockResolvedValue(undefined);
    });


    it(
        'modifie le workspace et écrit son AuditLog dans la même transaction',
        async () => {
            const workspace = {
                _id: 'workspace-id',
                name: 'Nouveau nom',
                status:
                    WORKSPACE_STATUS.ACTIVE,
            };

            Workspace.findOneAndUpdate
                .mockResolvedValue(workspace);

            const result =
                await updateWorkspace({
                    workspaceId:
                        'workspace-id',
                    name:
                        'Nouveau nom',
                    actorId:
                        'actor-id',
                    ipAddress:
                        '127.0.0.1',
                    userAgent:
                        'vitest-agent',
                });

            expect(
                mongoose
                    .connection
                    .transaction,
            ).toHaveBeenCalledOnce();

            expect(
                Workspace.findOneAndUpdate,
            ).toHaveBeenCalledWith(
                {
                    _id: 'workspace-id',
                    status:
                        WORKSPACE_STATUS
                            .ACTIVE,
                },
                {
                    $set: {
                        name:
                            'Nouveau nom',
                        updatedBy:
                            'actor-id',
                    },
                },
                {
                    returnDocument:
                        'after',
                    runValidators: true,
                    session,
                },
            );

            expect(
                createAuditLog,
            ).toHaveBeenCalledOnce();

            expect(
                createAuditLog,
            ).toHaveBeenCalledWith(
                {
                    actor:
                        'actor-id',

                    workspace:
                        'workspace-id',

                    action:
                        AUDIT_ACTION
                            .WORKSPACE_UPDATED,

                    entityType:
                        AUDIT_ENTITY_TYPE
                            .WORKSPACE,

                    entityId:
                        'workspace-id',

                    status:
                        AUDIT_STATUS.SUCCESS,

                    ipAddress:
                        '127.0.0.1',

                    userAgent:
                        'vitest-agent',

                    metadata: {
                        changedFields: [
                            'name',
                        ],
                    },
                },
                {
                    session,
                },
            );

            expect(result)
                .toBe(workspace);
        },
    );


    it(
        'n’écrit aucun AuditLog si le workspace n’est plus modifiable',
        async () => {
            Workspace.findOneAndUpdate
                .mockResolvedValue(null);

            const result =
                await updateWorkspace({
                    workspaceId:
                        'workspace-id',
                    name:
                        'Nouveau nom',
                    actorId:
                        'actor-id',
                });

            expect(result)
                .toBeNull();

            expect(
                createAuditLog,
            ).not.toHaveBeenCalled();
        },
    );


    it(
        'propage l’échec de l’AuditLog afin que la transaction puisse être annulée',
        async () => {
            const workspace = {
                _id: 'workspace-id',
                name: 'Nouveau nom',
            };

            Workspace.findOneAndUpdate
                .mockResolvedValue(workspace);

            const auditError =
                new Error(
                    'Audit indisponible',
                );

            createAuditLog
                .mockRejectedValue(
                    auditError,
                );

            await expect(
                updateWorkspace({
                    workspaceId:
                        'workspace-id',
                    name:
                        'Nouveau nom',
                    actorId:
                        'actor-id',
                }),
            ).rejects.toBe(
                auditError,
            );

            expect(
                createAuditLog,
            ).toHaveBeenCalledOnce();
        },
    );
});