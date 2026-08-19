import {
    storageConfig,
} from "../../config/storage.config.js";

import {
    temporaryFileService,
} from "./temporaryFile.service.js";


/**
 * Construit l'orchestrateur de maintenance des fichiers temporaires.
 *
 * La détection et la suppression restent dans temporaryFile.service.js.
 * Cette couche décide uniquement :
 * - quand appeler la purge ;
 * - comment rendre compte de son résultat ;
 * - comment empêcher une erreur de maintenance de bloquer l'application.
 *
 * Les dépendances sont injectées afin de tester ces décisions sans accéder
 * au véritable système de fichiers ni écrire dans la console des tests.
 */
const createTemporaryFileMaintenanceService = ({
    temporaryFiles,
    minimumAgeMs,
    logger = console,
}) => {
    if (
        !temporaryFiles
        || typeof temporaryFiles
            .purgeOrphanTemporaryFiles !== "function"
    ) {
        throw new TypeError(
            "Le service de fichiers temporaires est invalide.",
        );
    }

    if (
        !Number.isInteger(minimumAgeMs)
        || minimumAgeMs <= 0
    ) {
        throw new TypeError(
            "L'âge minimal des fichiers temporaires doit être un entier positif.",
        );
    }

    if (
        !logger
        || typeof logger.info !== "function"
        || typeof logger.warn !== "function"
        || typeof logger.error !== "function"
    ) {
        throw new TypeError(
            "Le journaliseur de maintenance est invalide.",
        );
    }


    /**
     * Exécute la purge de démarrage sans propager ses erreurs.
     *
     * La purge est une mesure de résilience, pas une condition nécessaire à
     * l'ouverture de l'API. Une panne ponctuelle du système de fichiers doit
     * donc être visible dans les journaux sans rendre tout le SaaS indisponible.
     */
    const runStartupCleanup = async () => {
        try {
            const cleanupResult =
                await temporaryFiles
                    .purgeOrphanTemporaryFiles({
                        minimumAgeMs,
                    });

            const cleanupSummary = Object.freeze({
                inspected: cleanupResult.inspected,
                discarded: cleanupResult.discarded,
                retained: cleanupResult.retained,
                missing: cleanupResult.missing,
                failed: cleanupResult.failed,
            });

            if (cleanupResult.failed > 0) {
                /*
                 * Une anomalie individuelle n'annule pas les suppressions
                 * réussies. Les détails permettent néanmoins d'identifier les
                 * ressources qui nécessitent une intervention.
                 */
                logger.warn(
                    "La purge des fichiers temporaires s'est terminée avec des anomalies.",
                    {
                        ...cleanupSummary,
                        failures: cleanupResult.failures,
                    },
                );
            } else {
                logger.info(
                    "La purge des fichiers temporaires est terminée.",
                    cleanupSummary,
                );
            }

            return Object.freeze({
                completed: true,
                cleanupResult,
            });
        } catch (error) {
            /*
             * Seules les informations nécessaires au diagnostic sont
             * journalisées. Aucun chemin de stockage complet n'est exposé.
             */
            logger.error(
                "La purge des fichiers temporaires n'a pas pu être exécutée.",
                {
                    code: error.code ?? null,
                    message: error.message,
                },
            );

            return Object.freeze({
                completed: false,
                error,
            });
        }
    };


    return Object.freeze({
        runStartupCleanup,
    });
};


/**
 * Instance prête à être appelée par le démarrage de l'application.
 */
const temporaryFileMaintenanceService =
    createTemporaryFileMaintenanceService({
        temporaryFiles: temporaryFileService,

        minimumAgeMs:
            storageConfig.local
                .temporaryFileMaximumAgeMs,
    });


export {
    createTemporaryFileMaintenanceService,
    temporaryFileMaintenanceService,
};