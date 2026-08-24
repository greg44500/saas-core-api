import { randomUUID } from 'node:crypto';

import {
    ALLOWED_FILE_TYPES,
    FILE_CATEGORY,
    FILE_SCAN_STATUS,
    FILE_STATUS,
    FILE_STORAGE_PROVIDER,
} from '../../constants/file.constants.js';

import {
    AUDIT_ACTION,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';

import {
    FILE_UPLOAD_REJECTION_REASON,
} from '../../constants/fileAudit.constants.js';

import {
    createAuditLog,
} from '../auditLog/auditLog.service.js';

import {
    fileUploadRejectedError,
} from './fileUploadRejected.error.js';

import {
    uploadedFileInspectionService,
} from '../../services/fileInspection/uploadedFileInspection.service.js';
import {
    storageService,
} from '../../services/storage/storage.service.js';
import {
    temporaryFileService,
} from '../../services/storage/temporaryFile.service.js';
import {
    filePersistenceService,
} from './filePersistence.service.js';

import {
    PlanLimitExceededError,
} from '../plan/planLimitExceeded.error.js';


const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const STORAGE_IDENTIFIER_PATTERN = /^[a-zA-Z0-9_-]+$/;
const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;


/**
 * Vérifie qu'une date représente réellement un instant exploitable.
 */
const isValidDate = (value) =>
    value instanceof Date
    && !Number.isNaN(value.getTime());


/**
 * Vérifie qu'une valeur peut représenter un ObjectId sans accepter les
 * conversions permissives historiques de Mongoose.
 */
const isCanonicalObjectId = (value) => {
    const stringValue =
        typeof value?.toString === 'function'
            ? value.toString()
            : '';

    return OBJECT_ID_PATTERN
        .test(stringValue);
};


/**
 * Normalise l'identifiant du workspace utilisé dans la clé physique.
 *
 * La clé de stockage constitue une frontière de sécurité distincte de la
 * validation Mongoose. Seul un ObjectId canonique peut donc devenir un
 * segment de chemin ; une valeur fournie par l'utilisateur ne peut jamais
 * injecter de séparateur ou de traversée de répertoire.
 */
const resolveWorkspaceStorageSegment = (workspaceId) => {
    if (!isCanonicalObjectId(workspaceId)) {
        throw new TypeError(
            "L'identifiant du workspace est invalide.",
        );
    }

    return workspaceId.toString().toLowerCase();
};


/**
 * Contrôle une seconde fois le résultat de l'inspection juste avant que le
 * temporaire puisse quitter la quarantaine.
 *
 * L'orchestrateur ne doit pas transformer un résultat partiel, falsifié ou
 * non clean en contenu définitif, même si une autre implémentation du service
 * d'inspection est injectée ultérieurement.
 */
const validateInspectedFile = ({
    inspectedFile,
    expectedFile,
}) => {
    const allowedType = Object.values(
        ALLOWED_FILE_TYPES,
    ).find(({ mimeType, extensions }) =>
        mimeType === inspectedFile?.mimeType
        && extensions.includes(
            inspectedFile?.extension,
        ));

    if (
        !inspectedFile
        || typeof inspectedFile !== 'object'
        || inspectedFile.filePath !== expectedFile.path
        || typeof inspectedFile.originalName
        !== 'string'
        || inspectedFile.originalName.trim() === ''
        || inspectedFile.originalName.length > 255
        || inspectedFile.originalName
        !== expectedFile.originalname
        || !Number.isInteger(
            inspectedFile.sizeBytes,
        )
        || inspectedFile.sizeBytes <= 0
        || inspectedFile.sizeBytes !== expectedFile.size
        || !allowedType
        || !SHA256_PATTERN.test(
            inspectedFile.checksumSha256,
        )
        || inspectedFile.malwareScan?.status
        !== FILE_SCAN_STATUS.CLEAN
        || typeof inspectedFile.malwareScan.provider
        !== 'string'
        || inspectedFile.malwareScan.provider.trim()
        === ''
        || !isValidDate(
            inspectedFile.malwareScan.scannedAt,
        )
    ) {
        throw new TypeError(
            "Le résultat de l'inspection du fichier est invalide.",
        );
    }
};


/**
 * Exécute une compensation sans masquer l'erreur qui l'a rendue nécessaire.
 */
const compensateAndThrow = async ({
    processingError,
    compensate,
    aggregateMessage,
}) => {
    try {
        await compensate();
    } catch (compensationError) {
        throw new AggregateError(
            [
                processingError,
                compensationError,
            ],
            aggregateMessage,
            {
                cause: processingError,
            },
        );
    }

    throw processingError;
};


/**
 * Construit l'orchestrateur qui rend un upload sain durable et crée ses
 * métadonnées MongoDB.
 *
 * La réservation transactionnelle des quotas et l'audit d'un upload réussi
 * sont délégués au service de persistance File.
 *
 * Un rejet intervenant avant la persistance est audité ici car aucun document
 * File ni aucune transaction métier n'existent encore à ce stade.
 */
const createFileService = ({
    inspectUploadedFile,
    generateStorageIdentifier,
    storeFile,
    deleteStoredFile,
    discardTemporaryFile,
    persistFileMetadataWithinPlanLimits,
    createAuditEvent,
}) => {
    if (
        typeof inspectUploadedFile !== 'function'
        || typeof generateStorageIdentifier
        !== 'function'
        || typeof storeFile !== 'function'
        || typeof deleteStoredFile !== 'function'
        || typeof discardTemporaryFile !== 'function'
        || typeof persistFileMetadataWithinPlanLimits
        !== 'function'
        || typeof createAuditEvent !== 'function'
    ) {
        throw new TypeError(
            'Les dépendances du service File sont invalides.',
        );
    }

    /**
     * Inspecte, stocke puis enregistre un fichier reçu par Multer.
     *
     * Le stockage physique précède MongoDB : un document File ne doit jamais
     * désigner un contenu qui n'existe pas. Puisque ces deux systèmes ne
     * partagent pas de transaction, la suppression physique compense un échec
     * de création du document.
     */
    const persistUploadedFile = async ({
        workspaceId,
        uploadedBy,
        file,
        category = FILE_CATEGORY.OTHER,
        ipAddress = null,
        userAgent = null,
    }) => {
        if (
            !file
            || typeof file !== 'object'
            || typeof file.path !== 'string'
            || file.path.trim() === ''
        ) {
            throw new TypeError(
                'Le fichier temporaire est obligatoire.',
            );
        }

        /*
         * Le service d'inspection reste propriétaire du nettoyage de toutes
         * ses branches d'échec. L'orchestrateur ne lance donc aucune seconde
         * compensation tant qu'il ne reçoit pas un résultat sain.
         */
        let inspectedFile;

        try {
            inspectedFile =
                await inspectUploadedFile({
                    filePath: file.path,
                    originalName: file.originalname,
                    declaredMimeType: file.mimetype,
                    sizeBytes: file.size,
                });
        } catch (inspectionError) {
            /*
             * Seuls les rejets explicitement qualifiés par le pipeline File
             * représentent un événement métier FILE_UPLOAD_REJECTED.
             *
             * Une erreur technique inattendue est propagée telle quelle afin
             * de ne jamais la présenter artificiellement comme un refus
             * fonctionnel ou de sécurité.
             */
            if (
                !(
                    inspectionError
                    instanceof fileUploadRejectedError
                )
            ) {
                throw inspectionError;
            }

            /*
             * Aucun document File n'existe encore lors d'un rejet
             * d'inspection. L'audit est donc rattaché uniquement à l'acteur
             * et au workspace, sans entityType ni entityId.
             *
             * Les métadonnées restent volontairement minimales : la raison
             * normalisée du rejet et la taille du contenu suffisent à la
             * traçabilité sans exposer le nom du fichier ni son contenu.
             */
            try {
                await createAuditEvent({
                    actor: uploadedBy,
                    workspace: workspaceId,
                    action:
                        AUDIT_ACTION.FILE_UPLOAD_REJECTED,
                    status:
                        AUDIT_STATUS.FAILED,
                    ipAddress,
                    userAgent,
                    metadata: {
                        reason:
                            inspectionError
                                .rejectionReason,
                        sizeBytes: file.size,
                    },
                });
            } catch {
                /*
                 * La décision de sécurité reste prioritaire sur sa
                 * journalisation. Une indisponibilité de l'AuditLog ne doit
                 * jamais transformer un fichier rejeté en upload acceptable
                 * ni masquer l'erreur originale.
                 */
            }

            throw inspectionError;
        }

        let storedName;
        let requestedStorageKey;

        try {
            if (!isCanonicalObjectId(uploadedBy)) {
                throw new TypeError(
                    "L'utilisateur ayant téléversé le fichier est invalide.",
                );
            }

            if (
                !Object.values(FILE_CATEGORY)
                    .includes(category)
            ) {
                throw new TypeError(
                    'La catégorie du fichier est invalide.',
                );
            }

            validateInspectedFile({
                inspectedFile,
                expectedFile: file,
            });

            const storageIdentifier =
                generateStorageIdentifier();

            if (
                typeof storageIdentifier !== 'string'
                || !STORAGE_IDENTIFIER_PATTERN
                    .test(storageIdentifier)
                || (
                    storageIdentifier.length
                    + inspectedFile.extension.length
                    + 1
                ) > 255
            ) {
                throw new TypeError(
                    "L'identifiant de stockage généré est invalide.",
                );
            }

            const workspaceSegment =
                resolveWorkspaceStorageSegment(
                    workspaceId,
                );

            storedName =
                `${storageIdentifier}.${inspectedFile.extension}`;

            /*
             * Le nom d'origine n'entre jamais dans la clé physique. La clé est
             * entièrement construite depuis des segments contrôlés par le
             * backend et reste portable entre le disque local et un futur S3.
             */
            requestedStorageKey = [
                'workspaces',
                workspaceSegment,
                storedName,
            ].join('/');

        } catch (preparationError) {
            /*
             * Une erreur de contexte, de métadonnée ou de génération survient
             * avant l'écriture physique. Le temporaire relève encore
             * exclusivement de la quarantaine et doit être détruit.
             */
            return compensateAndThrow({
                processingError: preparationError,
                compensate: () =>
                    discardTemporaryFile(
                        inspectedFile.filePath,
                    ),
                aggregateMessage:
                    'La préparation du fichier et le nettoyage du temporaire ont échoué.',
            });
        }

        let storageResult;

        try {
            storageResult = await storeFile({
                sourcePath: inspectedFile.filePath,
                storageKey: requestedStorageKey,
            });
        } catch (storageError) {
            /*
             * Un fournisseur qui rejette l'opération n'a pas confirmé de
             * contenu définitif. Un nettoyage idempotent retire donc toute
             * source que le fournisseur n'aurait pas déjà consommée.
             */
            return compensateAndThrow({
                processingError: storageError,
                compensate: () =>
                    discardTemporaryFile(
                        inspectedFile.filePath,
                    ),
                aggregateMessage:
                    'Le stockage du fichier et le nettoyage du temporaire ont échoué.',
            });
        }

        try {
            /*
             * Une promesse de stockage résolue signifie que le contenu a
             * quitté la quarantaine. Toute incohérence découverte à partir
             * d'ici relève donc de la compensation physique définitive.
             */
            if (
                !storageResult
                || !Object.values(
                    FILE_STORAGE_PROVIDER,
                ).includes(
                    storageResult.storageProvider,
                )
                || storageResult.storageKey
                !== requestedStorageKey
            ) {
                throw new TypeError(
                    'Le résultat du stockage définitif est invalide.',
                );
            }

            return await persistFileMetadataWithinPlanLimits({
                fileData: {
                    workspace: workspaceId,
                    uploadedBy,
                    originalName:
                        inspectedFile.originalName,
                    storedName,
                    mimeType: inspectedFile.mimeType,
                    extension: inspectedFile.extension,
                    sizeBytes: inspectedFile.sizeBytes,
                    storageProvider:
                        storageResult.storageProvider,
                    storageKey: storageResult.storageKey,
                    checksumSha256:
                        inspectedFile.checksumSha256,
                    category,
                    status: FILE_STATUS.ACTIVE,
                    malwareScan:
                        inspectedFile.malwareScan,
                    updatedBy: uploadedBy,
                },
                ipAddress,
                userAgent,
            });
        } catch (databaseError) {
            /*
             * Le fournisseur et la clé retournés par le service de stockage
             * sont la seule identité fiable pour la compensation. On ne les
             * reconstruit pas depuis les paramètres initiaux.
             */
            if (
                databaseError
                instanceof PlanLimitExceededError
            ) {
                /*
                 * Le dépassement de quota intervient après le stockage
                 * physique mais avant la création durable du document File.
                 *
                 * La suppression du contenu définitif doit donc réussir avant
                 * que le rejet soit considéré comme complètement traité.
                 */
                try {
                    await deleteStoredFile({
                        provider:
                            storageResult.storageProvider,
                        storageKey:
                            storageResult.storageKey,
                    });
                } catch (compensationError) {
                    /*
                     * Si la compensation échoue, on conserve les deux causes.
                     * Aucun FILE_UPLOAD_REJECTED n'est écrit à ce stade car
                     * le contenu physique n'a pas été confirmé comme supprimé.
                     */
                    throw new AggregateError(
                        [
                            databaseError,
                            compensationError,
                        ],
                        'Le dépassement de limite du plan et la compensation du stockage ont échoué.',
                        {
                            cause: databaseError,
                        },
                    );
                }

                /*
                 * La transaction MongoDB a été annulée et le contenu physique
                 * a été supprimé. Le rejet peut maintenant être journalisé
                 * sans laisser croire qu'un fichier durable existe encore.
                 */
                try {
                    await createAuditEvent({
                        actor: uploadedBy,
                        workspace: workspaceId,
                        action:
                            AUDIT_ACTION.FILE_UPLOAD_REJECTED,
                        status:
                            AUDIT_STATUS.FAILED,
                        ipAddress,
                        userAgent,
                        metadata: {
                            reason:
                                FILE_UPLOAD_REJECTION_REASON
                                    .PLAN_LIMIT_REACHED,
                            sizeBytes:
                                inspectedFile.sizeBytes,
                        },
                    });
                } catch {
                    /*
                     * Le refus imposé par le plan reste prioritaire sur sa
                     * journalisation. Une indisponibilité de l'AuditLog ne
                     * doit jamais permettre l'upload ni masquer le 403 initial.
                     */
                }

                throw databaseError;
            }

            return compensateAndThrow({
                processingError: databaseError,
                compensate: () =>
                    deleteStoredFile({
                        provider:
                            storageResult.storageProvider,
                        storageKey:
                            storageResult.storageKey,
                    }),
                aggregateMessage:
                    'La création du document File et la compensation du stockage ont échoué.',
            });
        }
    };

    return Object.freeze({
        persistUploadedFile,
    });
};


/**
 * Assemble l'instance applicative sans exposer les détails des fournisseurs
 * ni le modèle Mongoose au code appelant.
 */
const fileService = createFileService({
    inspectUploadedFile: (parameters) =>
        uploadedFileInspectionService
            .inspectUploadedFile(parameters),

    generateStorageIdentifier: randomUUID,

    storeFile: (parameters) =>
        storageService.storeFile(parameters),

    deleteStoredFile: ({
        provider,
        storageKey,
    }) => storageService.deleteFile({
        provider,
        storageKey,
    }),

    discardTemporaryFile: (filePath) =>
        temporaryFileService
            .discardTemporaryFile(filePath),

    persistFileMetadataWithinPlanLimits:
        (parameters) =>
            filePersistenceService
                .persistFileMetadataWithinPlanLimits(
                    parameters,
                ),

    createAuditEvent: (auditData) =>
        createAuditLog(auditData),
});


export {
    createFileService,
    fileService,
};