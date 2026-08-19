import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    CORE_PLAN_FEATURE,
    CORE_PLAN_METRIC,
} from '../../modules/plan/planCapability.registry.js';

import {
    createFilePersistenceService,
} from '../../modules/file/filePersistence.service.js';


describe('filePersistence.service', () => {
    let session;
    let planEntitlement;
    let fileData;
    let createdFile;

    let runTransaction;
    let resolvePlanEntitlement;
    let assertFeatureAvailable;
    let reservePlanLimit;
    let createFileDocuments;

    let service;

    beforeEach(() => {
        session = {
            id: 'transaction-session',
        };

        planEntitlement = {
            subscription: {
                id: 'subscription-id',
            },
            plan: {
                features: [
                    CORE_PLAN_FEATURE.FILE_UPLOAD,
                ],
            },
        };

        fileData = {
            workspace: 'workspace-id',
            uploadedBy: 'user-id',
            originalName: 'document.pdf',
            storedName: 'stored-document.pdf',
            sizeBytes: 4096,
        };

        createdFile = {
            id: 'file-id',
            ...fileData,
        };

        /*
         * Le faux transaction manager exécute le callback avec une session
         * stable. Les tests peuvent ainsi vérifier que toutes les opérations
         * reçoivent exactement la même instance.
         */
        runTransaction = vi.fn(
            async (callback) => callback(session),
        );

        resolvePlanEntitlement = vi.fn()
            .mockResolvedValue(planEntitlement);

        assertFeatureAvailable = vi.fn();

        reservePlanLimit = vi.fn()
            .mockResolvedValue({
                usageMetric: {
                    value: 1,
                },
            });

        createFileDocuments = vi.fn()
            .mockResolvedValue([createdFile]);

        service = createFilePersistenceService({
            runTransaction,
            resolvePlanEntitlement,
            assertFeatureAvailable,
            reservePlanLimit,
            createFileDocuments,
        });
    });

    it(
        'réserve les deux quotas puis crée File dans la même transaction',
        async () => {
            const at = new Date(
                '2026-08-19T09:00:00.000Z',
            );

            const result =
                await service
                    .persistFileMetadataWithinPlanLimits({
                        fileData,
                        at,
                    });

            expect(result).toBe(createdFile);

            expect(runTransaction)
                .toHaveBeenCalledTimes(1);

            expect(resolvePlanEntitlement)
                .toHaveBeenCalledWith({
                    workspaceId: fileData.workspace,
                    session,
                });

            expect(assertFeatureAvailable)
                .toHaveBeenCalledWith({
                    plan: planEntitlement.plan,
                    featureKey:
                        CORE_PLAN_FEATURE.FILE_UPLOAD,
                });

            expect(reservePlanLimit)
                .toHaveBeenNthCalledWith(1, {
                    workspaceId: fileData.workspace,
                    planEntitlement,
                    metricKey:
                        CORE_PLAN_METRIC
                            .FILE_UPLOADS_MONTHLY,
                    amount: 1,
                    at,
                    actorId: fileData.uploadedBy,
                    session,
                });

            expect(reservePlanLimit)
                .toHaveBeenNthCalledWith(2, {
                    workspaceId: fileData.workspace,
                    planEntitlement,
                    metricKey:
                        CORE_PLAN_METRIC.STORAGE_BYTES,
                    amount: fileData.sizeBytes,
                    at,
                    actorId: fileData.uploadedBy,
                    session,
                });

            expect(createFileDocuments)
                .toHaveBeenCalledWith(
                    [{ ...fileData }],
                    { session },
                );
        },
    );

    it(
        'respecte l’ordre des opérations transactionnelles',
        async () => {
            const operationOrder = [];

            resolvePlanEntitlement
                .mockImplementation(async () => {
                    operationOrder.push('entitlement');

                    return planEntitlement;
                });

            assertFeatureAvailable
                .mockImplementation(() => {
                    operationOrder.push('feature');
                });

            reservePlanLimit
                .mockImplementation(async ({
                    metricKey,
                }) => {
                    operationOrder.push(metricKey);

                    return {
                        usageMetric: {},
                    };
                });

            createFileDocuments
                .mockImplementation(async () => {
                    operationOrder.push('file');

                    return [createdFile];
                });

            await service
                .persistFileMetadataWithinPlanLimits({
                    fileData,
                });

            expect(operationOrder).toEqual([
                'entitlement',
                'feature',
                CORE_PLAN_METRIC.FILE_UPLOADS_MONTHLY,
                CORE_PLAN_METRIC.STORAGE_BYTES,
                'file',
            ]);
        },
    );

    it(
        'ne réserve aucun quota lorsque la fonctionnalité est refusée',
        async () => {
            const featureError =
                new Error('Feature refusée');

            assertFeatureAvailable
                .mockImplementation(() => {
                    throw featureError;
                });

            await expect(
                service
                    .persistFileMetadataWithinPlanLimits({
                        fileData,
                    }),
            ).rejects.toBe(featureError);

            expect(reservePlanLimit)
                .not.toHaveBeenCalled();

            expect(createFileDocuments)
                .not.toHaveBeenCalled();
        },
    );

    it(
        'arrête la transaction lorsque le quota mensuel est refusé',
        async () => {
            const quotaError =
                new Error('Quota mensuel atteint');

            reservePlanLimit
                .mockRejectedValueOnce(quotaError);

            await expect(
                service
                    .persistFileMetadataWithinPlanLimits({
                        fileData,
                    }),
            ).rejects.toBe(quotaError);

            expect(reservePlanLimit)
                .toHaveBeenCalledTimes(1);

            expect(createFileDocuments)
                .not.toHaveBeenCalled();
        },
    );

    it(
        'ne crée pas File lorsque le quota de stockage est refusé',
        async () => {
            const storageQuotaError =
                new Error('Quota de stockage atteint');

            reservePlanLimit
                .mockResolvedValueOnce({
                    usageMetric: {},
                })
                .mockRejectedValueOnce(
                    storageQuotaError,
                );

            await expect(
                service
                    .persistFileMetadataWithinPlanLimits({
                        fileData,
                    }),
            ).rejects.toBe(storageQuotaError);

            expect(reservePlanLimit)
                .toHaveBeenCalledTimes(2);

            expect(createFileDocuments)
                .not.toHaveBeenCalled();
        },
    );

    it(
        'propage l’échec de création de File pour faire abandonner la transaction',
        async () => {
            const databaseError =
                new Error('Création File impossible');

            createFileDocuments
                .mockRejectedValue(databaseError);

            await expect(
                service
                    .persistFileMetadataWithinPlanLimits({
                        fileData,
                    }),
            ).rejects.toBe(databaseError);
        },
    );

    it(
        'refuse une taille invalide avant d’ouvrir une transaction',
        async () => {
            await expect(
                service
                    .persistFileMetadataWithinPlanLimits({
                        fileData: {
                            ...fileData,
                            sizeBytes: 0,
                        },
                    }),
            ).rejects.toThrow(TypeError);

            expect(runTransaction)
                .not.toHaveBeenCalled();
        },
    );
});