import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    AUDIT_ACTION,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';

import {
    FILE_UPLOAD_REJECTION_REASON,
} from '../../constants/fileAudit.constants.js';

import {
    FILE_CATEGORY,
    FILE_SCAN_STATUS,
    FILE_STATUS,
    FILE_STORAGE_PROVIDER,
} from '../../constants/file.constants.js';

import {
    createFileService,
} from '../../modules/file/file.service.js';

import {
    fileUploadRejectedError,
} from '../../modules/file/fileUploadRejected.error.js';

import {
    PlanLimitExceededError,
} from '../../modules/plan/planLimitExceeded.error.js';


const WORKSPACE_ID =
    '64b64c0f2f4b1a0012345678';

const USER_ID =
    '64b64c0f2f4b1a0087654321';

const TEMPORARY_PATH =
    '/temporary/uploaded-file';

const STORAGE_IDENTIFIER =
    'generated-storage-id';

const STORAGE_KEY =
    `workspaces/${WORKSPACE_ID}/${STORAGE_IDENTIFIER}.pdf`;

const SCANNED_AT = new Date(
    '2026-08-18T14:00:00.000Z',
);

const IP_ADDRESS = '127.0.0.1';

const USER_AGENT =
    'Mozilla/5.0 Test Browser';


const createUpload = () => ({
    path: TEMPORARY_PATH,
    originalname: '../../facture finale.pdf',
    mimetype: 'application/pdf',
    size: 1_024,
});


const createInspectionResult = () => ({
    filePath: TEMPORARY_PATH,
    originalName: '../../facture finale.pdf',
    sizeBytes: 1_024,
    mimeType: 'application/pdf',
    extension: 'pdf',
    checksumSha256: 'a'.repeat(64),
    malwareScan: {
        status: FILE_SCAN_STATUS.CLEAN,
        provider: 'clamav-local',
        scannedAt: SCANNED_AT,
        threatName: null,
        errorCode: null,
    },
});


const createDependencies = () => ({
    inspectUploadedFile:
        vi.fn().mockResolvedValue(
            createInspectionResult(),
        ),

    generateStorageIdentifier:
        vi.fn().mockReturnValue(
            STORAGE_IDENTIFIER,
        ),

    storeFile:
        vi.fn().mockImplementation(
            async ({ storageKey }) => ({
                storageProvider:
                    FILE_STORAGE_PROVIDER.LOCAL,
                storageKey,
            }),
        ),

    deleteStoredFile:
        vi.fn().mockResolvedValue({
            deleted: true,
        }),

    discardTemporaryFile:
        vi.fn().mockResolvedValue({
            discarded: true,
        }),

    persistFileMetadataWithinPlanLimits:
        vi.fn().mockResolvedValue({
            id: 'created-file-id',
        }),

    createAuditEvent:
        vi.fn().mockResolvedValue({
            id: 'created-audit-id',
        }),
});


const persistFile = ({
    service,
    overrides = {},
} = {}) => service.persistUploadedFile({
    workspaceId: WORKSPACE_ID,
    uploadedBy: USER_ID,
    file: createUpload(),
    category: FILE_CATEGORY.DOCUMENT,
    ...overrides,
    ipAddress: IP_ADDRESS,
    userAgent: USER_AGENT,
});


describe('File service', () => {
    it(
        'stocke le résultat clean avant de créer le document File actif',
        async () => {
            const dependencies =
                createDependencies();

            const service = createFileService(
                dependencies,
            );

            const result = await persistFile({
                service,
            });

            expect(
                dependencies.inspectUploadedFile,
            ).toHaveBeenCalledWith({
                filePath: TEMPORARY_PATH,
                originalName:
                    '../../facture finale.pdf',
                declaredMimeType:
                    'application/pdf',
                sizeBytes: 1_024,
            });

            expect(
                dependencies.storeFile,
            ).toHaveBeenCalledWith({
                sourcePath: TEMPORARY_PATH,
                storageKey: STORAGE_KEY,
            });

            expect(
                dependencies
                    .persistFileMetadataWithinPlanLimits,
            ).toHaveBeenCalledWith({
                fileData: {
                    workspace: WORKSPACE_ID,
                    uploadedBy: USER_ID,
                    originalName:
                        '../../facture finale.pdf',
                    storedName:
                        `${STORAGE_IDENTIFIER}.pdf`,
                    mimeType:
                        'application/pdf',
                    extension: 'pdf',
                    sizeBytes: 1_024,
                    storageProvider:
                        FILE_STORAGE_PROVIDER.LOCAL,
                    storageKey: STORAGE_KEY,
                    checksumSha256:
                        'a'.repeat(64),
                    category:
                        FILE_CATEGORY.DOCUMENT,
                    status:
                        FILE_STATUS.ACTIVE,
                    malwareScan:
                        createInspectionResult()
                            .malwareScan,
                    updatedBy: USER_ID,
                },
                ipAddress: IP_ADDRESS,
                userAgent: USER_AGENT,
            });

            expect(
                dependencies.storeFile.mock
                    .invocationCallOrder[0],
            ).toBeLessThan(
                dependencies
                    .persistFileMetadataWithinPlanLimits
                    .mock.invocationCallOrder[0],
            );

            expect(
                dependencies.discardTemporaryFile,
            ).not.toHaveBeenCalled();

            expect(
                dependencies.deleteStoredFile,
            ).not.toHaveBeenCalled();

            expect(
                dependencies.createAuditEvent,
            ).not.toHaveBeenCalled();

            expect(result).toEqual({
                id: 'created-file-id',
            });
        },
    );


    it(
        "construit un nom et une clé indépendants du nom d'origine",
        async () => {
            const dependencies =
                createDependencies();

            const service = createFileService(
                dependencies,
            );

            await persistFile({
                service,
            });

            const storedFileData =
                dependencies
                    .persistFileMetadataWithinPlanLimits
                    .mock.calls[0][0]
                    .fileData;

            expect(
                storedFileData.storedName,
            ).toBe(
                `${STORAGE_IDENTIFIER}.pdf`,
            );

            expect(
                storedFileData.storageKey,
            ).toBe(STORAGE_KEY);

            expect(
                storedFileData.storageKey,
            ).not.toContain('facture');

            expect(
                storedFileData.storageKey,
            ).not.toContain('..');
        },
    );


    it(
        "laisse l'inspection gérer son propre nettoyage lorsqu'elle échoue",
        async () => {
            const dependencies =
                createDependencies();

            const inspectionError =
                new Error(
                    'Inspection failed',
                );

            dependencies.inspectUploadedFile
                .mockRejectedValue(
                    inspectionError,
                );

            const service = createFileService(
                dependencies,
            );

            await expect(
                persistFile({
                    service,
                }),
            ).rejects.toBe(
                inspectionError,
            );

            /*
             * Une erreur technique non qualifiée ne représente pas un rejet
             * métier FILE_UPLOAD_REJECTED.
             */
            expect(
                dependencies.createAuditEvent,
            ).not.toHaveBeenCalled();

            expect(
                dependencies.storeFile,
            ).not.toHaveBeenCalled();

            expect(
                dependencies
                    .persistFileMetadataWithinPlanLimits,
            ).not.toHaveBeenCalled();

            expect(
                dependencies.discardTemporaryFile,
            ).not.toHaveBeenCalled();
        },
    );


    it(
        "audite un rejet qualifié d'inspection sans tenter de stocker le fichier",
        async () => {
            const dependencies =
                createDependencies();

            const inspectionError =
                new fileUploadRejectedError(
                    "Le type réel du fichier n'est pas autorisé.",
                    415,
                    FILE_UPLOAD_REJECTION_REASON
                        .FILE_TYPE_NOT_ALLOWED,
                );

            dependencies.inspectUploadedFile
                .mockRejectedValue(
                    inspectionError,
                );

            const service = createFileService(
                dependencies,
            );

            await expect(
                persistFile({
                    service,
                }),
            ).rejects.toBe(
                inspectionError,
            );

            expect(
                dependencies.createAuditEvent,
            ).toHaveBeenCalledTimes(1);

            expect(
                dependencies.createAuditEvent,
            ).toHaveBeenCalledWith({
                actor: USER_ID,
                workspace: WORKSPACE_ID,
                action:
                    AUDIT_ACTION
                        .FILE_UPLOAD_REJECTED,
                status:
                    AUDIT_STATUS.FAILED,
                ipAddress: IP_ADDRESS,
                userAgent: USER_AGENT,
                metadata: {
                    reason:
                        FILE_UPLOAD_REJECTION_REASON
                            .FILE_TYPE_NOT_ALLOWED,
                    sizeBytes: 1_024,
                },
            });

            expect(
                dependencies.storeFile,
            ).not.toHaveBeenCalled();

            expect(
                dependencies
                    .persistFileMetadataWithinPlanLimits,
            ).not.toHaveBeenCalled();

            /*
             * Le nettoyage a déjà été réalisé par le service d'inspection.
             * L'orchestrateur File ne doit pas tenter un second nettoyage.
             */
            expect(
                dependencies.discardTemporaryFile,
            ).not.toHaveBeenCalled();

            expect(
                dependencies.deleteStoredFile,
            ).not.toHaveBeenCalled();
        },
    );


    it(
        "conserve le rejet initial lorsque l'écriture de l'AuditLog échoue",
        async () => {
            const dependencies =
                createDependencies();

            const inspectionError =
                new fileUploadRejectedError(
                    "Le fichier n’a pas pu être accepté. Le téléversement a été annulé.",
                    422,
                    FILE_UPLOAD_REJECTION_REASON
                        .MALWARE_DETECTED,
                );

            const auditError =
                new Error(
                    'AuditLog unavailable',
                );

            dependencies.inspectUploadedFile
                .mockRejectedValue(
                    inspectionError,
                );

            dependencies.createAuditEvent
                .mockRejectedValue(
                    auditError,
                );

            const service = createFileService(
                dependencies,
            );

            /*
             * La sécurité prime sur la journalisation : même si l'AuditLog
             * échoue, le rejet original doit rester l'erreur observable.
             */
            await expect(
                persistFile({
                    service,
                }),
            ).rejects.toBe(
                inspectionError,
            );

            expect(
                dependencies.createAuditEvent,
            ).toHaveBeenCalledTimes(1);

            expect(
                dependencies.storeFile,
            ).not.toHaveBeenCalled();

            expect(
                dependencies
                    .persistFileMetadataWithinPlanLimits,
            ).not.toHaveBeenCalled();

            expect(
                dependencies.discardTemporaryFile,
            ).not.toHaveBeenCalled();

            expect(
                dependencies.deleteStoredFile,
            ).not.toHaveBeenCalled();
        },
    );


    it(
        'refuse un résultat non clean et détruit le temporaire avant tout stockage',
        async () => {
            const dependencies =
                createDependencies();

            dependencies.inspectUploadedFile
                .mockResolvedValue({
                    ...createInspectionResult(),
                    malwareScan: {
                        status:
                            FILE_SCAN_STATUS.PENDING,
                        provider:
                            'clamav-local',
                        scannedAt:
                            SCANNED_AT,
                    },
                });

            const service = createFileService(
                dependencies,
            );

            await expect(
                persistFile({
                    service,
                }),
            ).rejects.toThrow(
                "Le résultat de l'inspection du fichier est invalide.",
            );

            expect(
                dependencies.discardTemporaryFile,
            ).toHaveBeenCalledWith(
                TEMPORARY_PATH,
            );

            expect(
                dependencies.storeFile,
            ).not.toHaveBeenCalled();

            expect(
                dependencies
                    .persistFileMetadataWithinPlanLimits,
            ).not.toHaveBeenCalled();

            expect(
                dependencies.createAuditEvent,
            ).not.toHaveBeenCalled();
        },
    );


    it(
        'détruit le temporaire lorsqu’une étape préparatoire échoue avant le stockage',
        async () => {
            const dependencies =
                createDependencies();

            const service = createFileService(
                dependencies,
            );

            await expect(
                persistFile({
                    service,
                    overrides: {
                        workspaceId:
                            '../workspace-invalide',
                    },
                }),
            ).rejects.toThrow(
                "L'identifiant du workspace est invalide.",
            );

            expect(
                dependencies.discardTemporaryFile,
            ).toHaveBeenCalledWith(
                TEMPORARY_PATH,
            );

            expect(
                dependencies.storeFile,
            ).not.toHaveBeenCalled();

            expect(
                dependencies.createAuditEvent,
            ).not.toHaveBeenCalled();
        },
    );


    it(
        'détruit le temporaire et ne crée aucun document si le stockage échoue',
        async () => {
            const dependencies =
                createDependencies();

            const storageError =
                new Error(
                    'Storage failed',
                );

            dependencies.storeFile
                .mockRejectedValue(
                    storageError,
                );

            const service = createFileService(
                dependencies,
            );

            await expect(
                persistFile({
                    service,
                }),
            ).rejects.toBe(
                storageError,
            );

            expect(
                dependencies.discardTemporaryFile,
            ).toHaveBeenCalledWith(
                TEMPORARY_PATH,
            );

            expect(
                dependencies
                    .persistFileMetadataWithinPlanLimits,
            ).not.toHaveBeenCalled();

            expect(
                dependencies.createAuditEvent,
            ).not.toHaveBeenCalled();
        },
    );


    it(
        'conserve les deux erreurs si le stockage et le nettoyage du temporaire échouent',
        async () => {
            const dependencies =
                createDependencies();

            const storageError =
                new Error(
                    'Storage failed',
                );

            const cleanupError =
                new Error(
                    'Temporary cleanup failed',
                );

            dependencies.storeFile
                .mockRejectedValue(
                    storageError,
                );

            dependencies.discardTemporaryFile
                .mockRejectedValue(
                    cleanupError,
                );

            const service = createFileService(
                dependencies,
            );

            try {
                await persistFile({
                    service,
                });

                throw new Error(
                    'Le service aurait dû rejeter la promesse.',
                );
            } catch (error) {
                expect(error)
                    .toBeInstanceOf(
                        AggregateError,
                    );

                expect(
                    error.errors,
                ).toEqual([
                    storageError,
                    cleanupError,
                ]);

                expect(
                    error.cause,
                ).toBe(
                    storageError,
                );
            }

            expect(
                dependencies.createAuditEvent,
            ).not.toHaveBeenCalled();
        },
    );


    it(
        'supprime le contenu définitif avec son fournisseur réel si MongoDB échoue',
        async () => {
            const dependencies =
                createDependencies();

            const databaseError =
                new Error(
                    'MongoDB failed',
                );

            dependencies.storeFile
                .mockResolvedValue({
                    storageProvider:
                        FILE_STORAGE_PROVIDER.S3,
                    storageKey: STORAGE_KEY,
                });

            dependencies
                .persistFileMetadataWithinPlanLimits
                .mockRejectedValue(
                    databaseError,
                );

            const service = createFileService(
                dependencies,
            );

            await expect(
                persistFile({
                    service,
                }),
            ).rejects.toBe(
                databaseError,
            );

            expect(
                dependencies.deleteStoredFile,
            ).toHaveBeenCalledWith({
                provider:
                    FILE_STORAGE_PROVIDER.S3,
                storageKey:
                    STORAGE_KEY,
            });

            expect(
                dependencies.discardTemporaryFile,
            ).not.toHaveBeenCalled();

            expect(
                dependencies.createAuditEvent,
            ).not.toHaveBeenCalled();
        },
    );


    it(
        'conserve les erreurs MongoDB et de compensation physique dans un AggregateError',
        async () => {
            const dependencies =
                createDependencies();

            const databaseError =
                new Error(
                    'MongoDB failed',
                );

            const compensationError =
                new Error(
                    'Physical deletion failed',
                );

            dependencies
                .persistFileMetadataWithinPlanLimits
                .mockRejectedValue(
                    databaseError,
                );

            dependencies.deleteStoredFile
                .mockRejectedValue(
                    compensationError,
                );

            const service = createFileService(
                dependencies,
            );

            try {
                await persistFile({
                    service,
                });

                throw new Error(
                    'Le service aurait dû rejeter la promesse.',
                );
            } catch (error) {
                expect(error)
                    .toBeInstanceOf(
                        AggregateError,
                    );

                expect(
                    error.errors,
                ).toEqual([
                    databaseError,
                    compensationError,
                ]);

                expect(
                    error.cause,
                ).toBe(
                    databaseError,
                );
            }

            expect(
                dependencies.createAuditEvent,
            ).not.toHaveBeenCalled();
        },
    );

    it(
        'compense le stockage puis audite le rejet lorsque la limite du plan est atteinte',
        async () => {
            const dependencies =
                createDependencies();

            const planLimitError =
                new PlanLimitExceededError(
                    'La limite storage_bytes du plan est atteinte.',
                    'storage_bytes',
                );

            dependencies
                .persistFileMetadataWithinPlanLimits
                .mockRejectedValue(
                    planLimitError,
                );

            const service = createFileService(
                dependencies,
            );

            await expect(
                persistFile({
                    service,
                }),
            ).rejects.toBe(
                planLimitError,
            );

            expect(
                dependencies.deleteStoredFile,
            ).toHaveBeenCalledWith({
                provider:
                    FILE_STORAGE_PROVIDER.LOCAL,
                storageKey:
                    STORAGE_KEY,
            });

            expect(
                dependencies.createAuditEvent,
            ).toHaveBeenCalledWith({
                actor: USER_ID,
                workspace: WORKSPACE_ID,
                action:
                    AUDIT_ACTION.FILE_UPLOAD_REJECTED,
                status:
                    AUDIT_STATUS.FAILED,
                ipAddress: IP_ADDRESS,
                userAgent: USER_AGENT,
                metadata: {
                    reason:
                        FILE_UPLOAD_REJECTION_REASON
                            .PLAN_LIMIT_REACHED,
                    sizeBytes: 1_024,
                },
            });

            /*
             * Le rejet ne peut être audité qu'après confirmation de la
             * compensation physique.
             */
            expect(
                dependencies.deleteStoredFile
                    .mock.invocationCallOrder[0],
            ).toBeLessThan(
                dependencies.createAuditEvent
                    .mock.invocationCallOrder[0],
            );

            expect(
                dependencies.discardTemporaryFile,
            ).not.toHaveBeenCalled();
        },
    );

    it(
        "n'audite pas le rejet de quota si la compensation physique échoue",
        async () => {
            const dependencies =
                createDependencies();

            const planLimitError =
                new PlanLimitExceededError(
                    'La limite storage_bytes du plan est atteinte.',
                    'storage_bytes',
                );

            const compensationError =
                new Error(
                    'Physical deletion failed',
                );

            dependencies
                .persistFileMetadataWithinPlanLimits
                .mockRejectedValue(
                    planLimitError,
                );

            dependencies.deleteStoredFile
                .mockRejectedValue(
                    compensationError,
                );

            const service = createFileService(
                dependencies,
            );

            try {
                await persistFile({
                    service,
                });

                throw new Error(
                    'Le service aurait dû rejeter la promesse.',
                );
            } catch (error) {
                expect(error)
                    .toBeInstanceOf(
                        AggregateError,
                    );

                expect(error.errors).toEqual([
                    planLimitError,
                    compensationError,
                ]);

                expect(error.cause)
                    .toBe(planLimitError);
            }

            expect(
                dependencies.createAuditEvent,
            ).not.toHaveBeenCalled();
        },
    );

    it(
        "conserve le rejet de quota lorsque l'écriture de l'AuditLog échoue",
        async () => {
            const dependencies =
                createDependencies();

            const planLimitError =
                new PlanLimitExceededError(
                    'La limite file_uploads_monthly du plan est atteinte.',
                    'file_uploads_monthly',
                );

            dependencies
                .persistFileMetadataWithinPlanLimits
                .mockRejectedValue(
                    planLimitError,
                );

            dependencies.createAuditEvent
                .mockRejectedValue(
                    new Error(
                        'AuditLog unavailable',
                    ),
                );

            const service = createFileService(
                dependencies,
            );

            await expect(
                persistFile({
                    service,
                }),
            ).rejects.toBe(
                planLimitError,
            );

            expect(
                dependencies.deleteStoredFile,
            ).toHaveBeenCalledTimes(1);

            expect(
                dependencies.createAuditEvent,
            ).toHaveBeenCalledTimes(1);
        },
    );
});