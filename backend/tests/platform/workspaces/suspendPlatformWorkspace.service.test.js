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
    WORKSPACE_STATUS_REASON,
} from '../../../constants/workspace.constants.js';

import {
    createAuditLog,
} from '../../../modules/auditLog/auditLog.service.js';

import {
    suspendPlatformWorkspace,
} from '../../../modules/platform/services/suspendPlatformWorkspace.service.js';

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


describe('suspendPlatformWorkspace', () => {
    const session = {
        id: 'session-1',
    };

    beforeEach(() => {
        vi.clearAllMocks();

        /*
         * Le mock conserve le contrat du driver :
         * le callback métier reçoit la session transactionnelle.
         */
        vi.spyOn(
            mongoose.connection,
            'transaction',
        ).mockImplementation(
            async (callback) => callback(session),
        );
    });

    it('suspend le workspace actif et audite la mutation', async () => {
        const statusChangedAt =
            new Date('2026-08-26T12:00:00.000Z');

        const suspendedWorkspace = {
            _id: {
                toString: () => 'workspace-id',
            },
            status:
                WORKSPACE_STATUS.SUSPENDED,
            statusReason:
                WORKSPACE_STATUS_REASON
                    .ADMINISTRATIVE_REVIEW,
            statusReasonDetails:
                'Vérification administrative en cours',
            statusChangedAt,
        };

        Workspace.findOneAndUpdate.mockResolvedValue(
            suspendedWorkspace,
        );

        createAuditLog.mockResolvedValue({});

        const result =
            await suspendPlatformWorkspace({
                workspaceId:
                    'workspace-id',
                actorId:
                    'admin-user-id',
                statusReason:
                    WORKSPACE_STATUS_REASON
                        .ADMINISTRATIVE_REVIEW,
                statusReasonDetails:
                    'Vérification administrative en cours',
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
                    WORKSPACE_STATUS.ACTIVE,
            },
            {
                $set:
                    expect.objectContaining({
                        status:
                            WORKSPACE_STATUS
                                .SUSPENDED,
                        statusReason:
                            WORKSPACE_STATUS_REASON
                                .ADMINISTRATIVE_REVIEW,
                        statusReasonDetails:
                            'Vérification administrative en cours',
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
                    suspendedWorkspace._id,
                action:
                    AUDIT_ACTION
                        .WORKSPACE_SUSPENDED,
                entityType:
                    AUDIT_ENTITY_TYPE
                        .WORKSPACE,
                entityId:
                    suspendedWorkspace._id,
                status:
                    AUDIT_STATUS.SUCCESS,
                ipAddress:
                    '127.0.0.1',
                userAgent:
                    'Vitest',
                metadata: {
                    statusReason:
                        WORKSPACE_STATUS_REASON
                            .ADMINISTRATIVE_REVIEW,
                    statusReasonDetails:
                        'Vérification administrative en cours',
                },
            },
            {
                session,
            },
        );

        expect(result).toEqual({
            id:
                'workspace-id',
            status:
                WORKSPACE_STATUS.SUSPENDED,
            statusReason:
                WORKSPACE_STATUS_REASON
                    .ADMINISTRATIVE_REVIEW,
            statusReasonDetails:
                'Vérification administrative en cours',
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
            suspendPlatformWorkspace({
                workspaceId:
                    'missing-workspace-id',
                actorId:
                    'admin-user-id',
                statusReason:
                    WORKSPACE_STATUS_REASON
                        .ADMINISTRATIVE_REVIEW,
            }),
        ).rejects.toMatchObject({
            statusCode: 404,
        });

        expect(
            createAuditLog,
        ).not.toHaveBeenCalled();
    });

    it('refuse la suspension lorsque le workspace n’est pas actif', async () => {
        Workspace.findOneAndUpdate.mockResolvedValue(
            null,
        );

        const findByIdQuery = {
            session: vi.fn().mockResolvedValue({
                _id:
                    'workspace-id',
                status:
                    WORKSPACE_STATUS.SUSPENDED,
            }),
        };

        Workspace.findById.mockReturnValue(
            findByIdQuery,
        );

        await expect(
            suspendPlatformWorkspace({
                workspaceId:
                    'workspace-id',
                actorId:
                    'admin-user-id',
                statusReason:
                    WORKSPACE_STATUS_REASON
                        .ADMINISTRATIVE_REVIEW,
            }),
        ).rejects.toMatchObject({
            statusCode: 409,
        });

        expect(
            createAuditLog,
        ).not.toHaveBeenCalled();
    });

    it('propage l’échec de l’audit afin que la transaction puisse être annulée', async () => {
        const suspendedWorkspace = {
            _id: {
                toString: () => 'workspace-id',
            },
            status:
                WORKSPACE_STATUS.SUSPENDED,
            statusReason:
                WORKSPACE_STATUS_REASON
                    .SECURITY_INCIDENT,
            statusReasonDetails: null,
            statusChangedAt:
                new Date(
                    '2026-08-26T12:00:00.000Z',
                ),
        };

        Workspace.findOneAndUpdate.mockResolvedValue(
            suspendedWorkspace,
        );

        createAuditLog.mockRejectedValue(
            new Error(
                'Audit log unavailable',
            ),
        );

        await expect(
            suspendPlatformWorkspace({
                workspaceId:
                    'workspace-id',
                actorId:
                    'admin-user-id',
                statusReason:
                    WORKSPACE_STATUS_REASON
                        .SECURITY_INCIDENT,
            }),
        ).rejects.toThrow(
            'Audit log unavailable',
        );

        expect(
            createAuditLog,
        ).toHaveBeenCalledOnce();
    });
});