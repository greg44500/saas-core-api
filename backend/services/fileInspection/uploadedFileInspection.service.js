import {
    FILE_SCAN_STATUS,
} from "../../constants/file.constants.js";

import {
    FILE_UPLOAD_REJECTION_REASON,
} from "../../constants/fileAudit.constants.js";

import {
    AppError,
} from "../../utils/appError.js";

import {
    fileUploadRejectedError,
} from "../../modules/file/fileUploadRejected.error.js";

import {
    malwareScanService,
} from "../malwareScan/malwareScan.service.js";

import {
    temporaryFileService,
} from "../storage/temporaryFile.service.js";

import {
    calculateFileSha256,
} from "./fileChecksum.service.js";

import {
    inspectUploadedFileType,
} from "./fileType.service.js";


/**
 * Construit le service chargé d'enchaîner les contrôles de sécurité.
 *
 * La factory rend chaque étape injectable afin que les tests vérifient
 * l'orchestration sans lire de véritable fichier ni lancer ClamAV.
 *
 * Ce service ne stocke pas le fichier et ne crée aucun document MongoDB.
 * Un résultat positif signifie seulement que le temporaire peut passer à
 * l'étape suivante du processus d'upload.
 */
const createUploadedFileInspectionService = ({
    inspectFileType,
    calculateChecksum,
    scanFile,
    discardTemporaryFile,
}) => {
    if (
        typeof inspectFileType !== "function"
        || typeof calculateChecksum !== "function"
        || typeof scanFile !== "function"
        || typeof discardTemporaryFile !== "function"
    ) {
        throw new TypeError(
            "Les dépendances de l'inspection du fichier sont invalides.",
        );
    }

    /**
     * Nettoie la quarantaine avant de propager l'échec initial.
     *
     * Si le nettoyage échoue également, les deux erreurs sont conservées :
     * masquer l'une d'elles empêcherait de diagnostiquer soit la cause du
     * rejet, soit la présence potentielle d'un fichier temporaire résiduel.
     */
    const discardAfterFailure = async ({
        filePath,
        processingError,
    }) => {
        try {
            await discardTemporaryFile(filePath);
        } catch (cleanupError) {
            throw new AggregateError(
                [
                    processingError,
                    cleanupError,
                ],
                "Le traitement du fichier et son nettoyage ont échoué.",
                {
                    cause: processingError,
                },
            );
        }

        throw processingError;
    };

    /**
     * Contrôle un fichier temporaire avant tout stockage définitif.
     *
     * Les opérations sont volontairement séquentielles :
     * - le type est contrôlé avant tout traitement supplémentaire ;
     * - l'empreinte est calculée sur le contenu qui sera analysé ;
     * - le verdict antivirus décide seul si le temporaire peut continuer.
     *
     * Toute exception ou tout verdict différent de clean déclenche la
     * destruction du temporaire avant que l'erreur ne soit propagée.
     */
    const inspectUploadedFile = async ({
        filePath,
        originalName,
        declaredMimeType,
        sizeBytes,
    }) => {
        /*
         * Un chemin valide est nécessaire avant d'entrer dans la zone où les
         * erreurs déclenchent un nettoyage. Sans chemin exploitable, le service
         * ne peut pas identifier de ressource temporaire à supprimer.
         */
        if (
            typeof filePath !== "string"
            || filePath.trim() === ""
        ) {
            throw new TypeError(
                "Le chemin du fichier temporaire est obligatoire.",
            );
        }

        try {
            if (
                typeof originalName !== "string"
                || originalName.trim() === ""
                || typeof declaredMimeType !== "string"
                || declaredMimeType.trim() === ""
            ) {
                throw new TypeError(
                    "Les métadonnées du fichier temporaire sont invalides.",
                );
            }

            if (
                !Number.isInteger(sizeBytes)
                || sizeBytes <= 0
            ) {
                throw new AppError(
                    "Le fichier fourni est vide ou invalide.",
                    400,
                );
            }

            const detectedType =
                await inspectFileType({
                    filePath,
                    originalName,
                    declaredMimeType,
                });

            const checksumSha256 =
                await calculateChecksum(filePath);

            const scanResult = await scanFile({
                filePath,
            });

            if (
                scanResult.status
                === FILE_SCAN_STATUS.INFECTED
            ) {
                throw new fileUploadRejectedError(
                    "Le fichier n’a pas pu être accepté. Le téléversement a été annulé.",
                    422,
                    FILE_UPLOAD_REJECTION_REASON
                        .MALWARE_DETECTED,
                );
            }

            /*
             * PENDING, ERROR ou tout futur statut inconnu appliquent la même
             * politique fermée. Seul CLEAN autorise la poursuite de l'upload.
             */
            if (
                scanResult.status
                !== FILE_SCAN_STATUS.CLEAN
            ) {
                throw new fileUploadRejectedError(
                    "Le fichier ne peut pas être traité pour le moment. Veuillez réessayer ultérieurement.",
                    503,
                    FILE_UPLOAD_REJECTION_REASON
                        .FILE_INSPECTION_FAILED,
                );
            }

            /*
             * Le résultat contient uniquement des métadonnées vérifiées.
             * Le chemin temporaire reste interne à la prochaine étape et ne
             * devra jamais être exposé dans une réponse HTTP publique.
             */
            return Object.freeze({
                filePath,
                originalName,
                sizeBytes,
                mimeType: detectedType.mimeType,
                extension: detectedType.extension,
                checksumSha256,
                malwareScan: scanResult,
            });
        } catch (processingError) {
            return discardAfterFailure({
                filePath,
                processingError,
            });
        }
    };

    return Object.freeze({
        inspectUploadedFile,
    });
};


/**
 * Assemble l'instance utilisée par l'application.
 *
 * L'adaptation des signatures reste locale à ce point de composition :
 * l'orchestrateur ne dépend ni des objets de service ni de leur fournisseur.
 */
const uploadedFileInspectionService =
    createUploadedFileInspectionService({
        inspectFileType:
            inspectUploadedFileType,

        calculateChecksum:
            calculateFileSha256,

        scanFile: ({ filePath }) =>
            malwareScanService.scanFile({
                filePath,
            }),

        discardTemporaryFile: (filePath) =>
            temporaryFileService
                .discardTemporaryFile(filePath),
    });


export {
    createUploadedFileInspectionService,
    uploadedFileInspectionService,
};