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
    createFilePersistenceService,
} from '../../../modules/file/filePersistence.service.js';


describe('File persistence audit', () => {
    let session;
    let fileData;
    let createdFile;
    let createAuditEvent;
    let service;

    beforeEach(() => {
        session = {
            id: 'mongo-session',
        };

        fileData = {
            workspace: 'workspace-id',
            uploadedBy: 'user-id',
            originalName: 'document.pdf',
            storedName: 'stored-document.pdf',
            sizeBytes: 4_096,
        };

        createdFile = {
            _id: 'file-id',
            ...fileData,
        };

        createAuditEvent = vi.fn()
            .mockResolvedValue(undefined);

        service = createFilePersistenceService({
            runTransaction: vi.fn(
                async (callback) =>
                    callback(session),
            ),
            /*
             * F10.3 fait de l'entitlement effectif l'autorité transactionnelle.
             * Ce test d'audit n'évalue pas les règles commerciales elles-mêmes,
             * mais son double doit respecter le contrat réel de la factory afin
             * de ne pas masquer une dérive de dépendances.
             */
            resolveEffectiveEntitlement: vi.fn()
                .mockResolvedValue({
                    subscription: {
                        _id: 'subscription-id',
                    },
                    plan: {
                        _id: 'plan-id',
                    },
                    effectiveCapabilities: {
                        features: [
                            'file_upload',
                        ],
                        limits: {
                            file_uploads_monthly: 10,
                            storage_bytes: 10_000,
                        },
                        appliedOverrides: [],
                    },
                }),
            assertFeatureAvailable: vi.fn(),
            reserveEffectiveLimit: vi.fn()
                .mockResolvedValue({
                    usageMetric: {},
                }),
            createFileDocuments: vi.fn()
                .mockResolvedValue([
                    createdFile,
                ]),
            createAuditEvent,
        });
    });


    it('audite la création du fichier dans la transaction', async () => {
        await service
            .persistFileMetadataWithinPlanLimits({
                fileData,
                ipAddress: '127.0.0.1',
                userAgent:
                    'Mozilla/5.0 Test Browser',
            });

        expect(createAuditEvent).toHaveBeenCalledWith(
            {
                actor: fileData.uploadedBy,
                workspace: fileData.workspace,
                action:
                    AUDIT_ACTION.FILE_UPLOADED,
                entityType:
                    AUDIT_ENTITY_TYPE.FILE,
                entityId: createdFile._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress: '127.0.0.1',
                userAgent:
                    'Mozilla/5.0 Test Browser',
                metadata: {
                    sizeBytes: fileData.sizeBytes,
                },
            },
            {
                session,
            },
        );
    });


    it('propage l’échec de l’audit', async () => {
        const auditError = new Error(
            'AuditLog persistence failed',
        );

        createAuditEvent.mockRejectedValue(
            auditError,
        );

        await expect(
            service
                .persistFileMetadataWithinPlanLimits({
                    fileData,
                    ipAddress: '127.0.0.1',
                    userAgent:
                        'Mozilla/5.0 Test Browser',
                }),
        ).rejects.toBe(auditError);
    });
});