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
    WORKSPACE_STATUS,
} from '../../../constants/workspace.constants.js';

import {
    createAuditLog,
} from '../../../modules/auditLog/auditLog.service.js';

import {
    reactivatePlatformWorkspace,
} from '../../../modules/platform/workspaces/services/reactivatePlatformWorkspace.service.js';

import {
    Workspace,
} from '../../../modules/workspace/workspace.model.js';


vi.mock(
    '../../../modules/workspace/workspace.model.js',
    () => ({
        Workspace: {
            findOneAndUpdate: vi.fn(),
            findById: vi.fn(),
        },
    }),
);

vi.mock(
    '../../../modules/auditLog/auditLog.service.js',
    () => ({
        createAuditLog: vi.fn(),
    }),
);


describe('reactivatePlatformWorkspace', () => {
    const session = {
        id: 'session-1',
    };

    beforeEach(() => {
        vi.clearAllMocks();

        /*
         * Le callback reçoit une session afin de conserver
         * le contrat transactionnel utilisé en production.
         */
        vi.spyOn(
            mongoose.connection,
            'transaction',
        ).mockImplementation(
            async (callback) => callback(session),
        );
    });

    it('réactive le workspace suspendu et audite la mutation', async () => {
        const statusChangedAt =
            new Date('2026-08-26T13:00:00.000Z');

        const reactivatedWorkspace = {
            _id: {
                toString: () => 'workspace-id',
            },
            status:
                WORKSPACE_STATUS.ACTIVE,
            statusReason: null,
            statusReasonDetails: null,
            statusChangedAt,
        };

        Workspace.findOneAndUpdate.mockResolvedValue(
            reactivatedWorkspace,
        );

        createAuditLog.mockResolvedValue({});

        const result =
            await reactivatePlatformWorkspace({
                workspaceId:
                    'workspace-id',
                actorId:
                    'admin-user-id',
                ipAddress:
                    '127.0.0.1',
                userAgent:
                    'Vitest',
            });

        expect(
            Workspace.findOneAndUpdate,
        ).toHaveBeenCalledWith(
            {
                _id: 'workspace-id',
                status:
                    WORKSPACE_STATUS.SUSPENDED,
            },
            {
                $set:
                    expect.objectContaining({
                        status:
                            WORKSPACE_STATUS.ACTIVE,
                        statusReason: null,
                        statusReasonDetails: null,
                        statusChangedBy:
                            'admin-user-id',
                        updatedBy:
                            'admin-user-id',
                    }),
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );

        expect(
            createAuditLog,
        ).toHaveBeenCalledWith(
            {
                actor:
                    'admin-user-id',
                workspace:
                    reactivatedWorkspace._id,
                action:
                    AUDIT_ACTION
                        .WORKSPACE_REACTIVATED,
                entityType:
                    AUDIT_ENTITY_TYPE
                        .WORKSPACE,
                entityId:
                    reactivatedWorkspace._id,
                status:
                    AUDIT_STATUS.SUCCESS,
                ipAddress:
                    '127.0.0.1',
                userAgent:
                    'Vitest',
            },
            {
                session,
            },
        );

        expect(result).toEqual({
            id:
                'workspace-id',
            status:
                WORKSPACE_STATUS.ACTIVE,
            statusReason: null,
            statusReasonDetails: null,
            statusChangedAt,
        });
    });

    it('retourne 404 lorsque le workspace n’existe pas', async () => {
        Workspace.findOneAndUpdate.mockResolvedValue(
            null,
        );

        const findByIdQuery = {
            session: vi.fn().mockResolvedValue(
                null,
            ),
        };

        Workspace.findById.mockReturnValue(
            findByIdQuery,
        );

        await expect(
            reactivatePlatformWorkspace({
                workspaceId:
                    'missing-workspace-id',
                actorId:
                    'admin-user-id',
            }),
        ).rejects.toMatchObject({
            statusCode: 404,
        });

        expect(
            createAuditLog,
        ).not.toHaveBeenCalled();
    });

    it('refuse la réactivation lorsque le workspace n’est pas suspendu', async () => {
        Workspace.findOneAndUpdate.mockResolvedValue(
            null,
        );

        const findByIdQuery = {
            session: vi.fn().mockResolvedValue({
                _id:
                    'workspace-id',
                status:
                    WORKSPACE_STATUS.ACTIVE,
            }),
        };

        Workspace.findById.mockReturnValue(
            findByIdQuery,
        );

        await expect(
            reactivatePlatformWorkspace({
                workspaceId:
                    'workspace-id',
                actorId:
                    'admin-user-id',
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(
            createAuditLog,
        ).not.toHaveBeenCalled();
    });

    it('propage l’échec de l’audit afin que la transaction puisse être annulée', async () => {
        const reactivatedWorkspace = {
            _id: {
                toString: () => 'workspace-id',
            },
            status:
                WORKSPACE_STATUS.ACTIVE,
            statusReason: null,
            statusReasonDetails: null,
            statusChangedAt:
                new Date(
                    '2026-08-26T13:00:00.000Z',
                ),
        };

        Workspace.findOneAndUpdate.mockResolvedValue(
            reactivatedWorkspace,
        );

        createAuditLog.mockRejectedValue(
            new Error(
                'Audit log unavailable',
            ),
        );

        await expect(
            reactivatePlatformWorkspace({
                workspaceId:
                    'workspace-id',
                actorId:
                    'admin-user-id',
            }),
        ).rejects.toThrow(
            'Audit log unavailable',
        );

        expect(
            createAuditLog,
        ).toHaveBeenCalledOnce();
    });
});