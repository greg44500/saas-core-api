import {
    lstat,
    readdir,
    unlink,
} from "node:fs/promises";

import path from "node:path";

import {
    storageConfig,
} from "../../config/storage.config.js";


/*
 * Une mauvaise configuration ne doit jamais permettre de considérer comme
 * abandonné un fichier qui vient seulement d'être créé.
 *
 * Cette limite constitue un dernier garde-fou technique. La durée réellement
 * utilisée par l'application sera plus prudente et configurable.
 */
const MINIMUM_ORPHAN_FILE_AGE_MS =
    5 * 60 * 1000;


/**
 * Vérifie qu'un chemin se trouve strictement sous une racine autorisée.
 *
 * La racine elle-même est volontairement exclue : une opération destinée à
 * un fichier ne doit jamais pouvoir cibler le répertoire temporaire complet.
 */
const isPathInside = (
    parentDirectory,
    candidatePath,
) => {
    const relativePath = path.relative(
        parentDirectory,
        candidatePath,
    );

    return (
        relativePath !== ""
        && !relativePath.startsWith("..")
        && !path.isAbsolute(relativePath)
    );
};


/**
 * Transforme une erreur de système de fichiers en information exploitable.
 *
 * Le chemin absolu n'est volontairement pas retourné : le nom présent dans
 * la quarantaine suffit pour les journaux techniques et limite l'exposition
 * de l'organisation interne du serveur.
 */
const createFailureSummary = (
    fileName,
    error,
) => Object.freeze({
    fileName,
    code: error.code ?? null,
    message: error.message,
});


/**
 * Construit le service responsable des fichiers temporaires de l'upload.
 *
 * Cette responsabilité reste séparée du stockage définitif : un fichier
 * rejeté n'a encore aucun fournisseur permanent et doit pouvoir être détruit
 * sans inventer une storageKey ou un document File.
 *
 * La factory permet aux tests :
 * - d'utiliser une quarantaine isolée ;
 * - de figer l'heure courante ;
 * - de ne jamais toucher au répertoire réellement configuré pour Multer.
 */
const createTemporaryFileService = ({
    temporaryDirectory,
    currentTime = () => Date.now(),
}) => {
    if (
        typeof temporaryDirectory !== "string"
        || temporaryDirectory.trim() === ""
    ) {
        throw new TypeError(
            "Le répertoire temporaire est obligatoire.",
        );
    }

    if (typeof currentTime !== "function") {
        throw new TypeError(
            "La source de temps doit être une fonction.",
        );
    }

    const resolvedTemporaryDirectory =
        path.resolve(temporaryDirectory);


    /**
     * Résout uniquement un chemin appartenant à la quarantaine configurée.
     *
     * Cette barrière empêche une erreur d'orchestration de transformer le
     * nettoyage d'un upload en suppression arbitraire sur le serveur.
     */
    const resolveTemporaryFilePath = (filePath) => {
        if (
            typeof filePath !== "string"
            || filePath.trim() === ""
            || filePath.includes("\0")
        ) {
            throw new TypeError(
                "Le chemin du fichier temporaire est invalide.",
            );
        }

        const resolvedFilePath =
            path.resolve(filePath);

        if (
            !isPathInside(
                resolvedTemporaryDirectory,
                resolvedFilePath,
            )
        ) {
            throw new TypeError(
                "Le fichier à supprimer n'appartient pas au répertoire temporaire.",
            );
        }

        return resolvedFilePath;
    };


    /**
     * Détruit un fichier abandonné dans la quarantaine.
     *
     * L'opération est idempotente : si le fichier a déjà disparu, l'état de
     * sécurité recherché est atteint. Les répertoires et liens symboliques
     * sont refusés afin que cette fonction ne supprime qu'un fichier ordinaire
     * effectivement créé pour un upload.
     */
    const discardTemporaryFile = async (
        filePath,
    ) => {
        const resolvedFilePath =
            resolveTemporaryFilePath(filePath);

        try {
            const fileStats =
                await lstat(resolvedFilePath);

            if (!fileStats.isFile()) {
                throw new TypeError(
                    "La ressource temporaire doit être un fichier ordinaire.",
                );
            }

            await unlink(resolvedFilePath);

            return Object.freeze({
                discarded: true,
            });
        } catch (error) {
            /*
             * L'absence peut résulter d'un nettoyage précédent ou d'une
             * compensation déjà exécutée. Elle ne doit pas masquer les autres
             * erreurs de permission ou de système de fichiers.
             */
            if (error.code === "ENOENT") {
                return Object.freeze({
                    discarded: false,
                });
            }

            throw error;
        }
    };


    /**
     * Supprime les fichiers temporaires suffisamment anciens pour être
     * considérés comme orphelins.
     *
     * Le parcours n'est pas récursif. Multer crée uniquement des fichiers
     * directement dans la quarantaine : un sous-répertoire ou un lien
     * symbolique constitue donc une ressource anormale et n'est jamais suivi.
     *
     * Une erreur isolée est ajoutée au bilan sans arrêter le traitement des
     * autres fichiers. Le démarrage ou la maintenance pourra ainsi journaliser
     * précisément les anomalies tout en nettoyant les ressources valides.
     */
    const purgeOrphanTemporaryFiles = async ({
        minimumAgeMs,
    }) => {
        if (
            !Number.isInteger(minimumAgeMs)
            || minimumAgeMs < MINIMUM_ORPHAN_FILE_AGE_MS
        ) {
            throw new TypeError(
                "L'âge minimal d'un fichier orphelin doit être un entier d'au moins cinq minutes.",
            );
        }

        const currentTimestamp = currentTime();

        if (
            typeof currentTimestamp !== "number"
            || !Number.isFinite(currentTimestamp)
        ) {
            throw new TypeError(
                "La source de temps doit retourner un timestamp valide.",
            );
        }

        const orphanThresholdTimestamp =
            currentTimestamp - minimumAgeMs;

        /*
         * withFileTypes évite un premier appel système par entrée, mais lstat
         * reste utilisé ensuite : le contenu du répertoire peut changer entre
         * sa lecture et la suppression.
         */
        const directoryEntries = await readdir(
            resolvedTemporaryDirectory,
            {
                withFileTypes: true,
            },
        );

        let discarded = 0;
        let retained = 0;
        let missing = 0;

        const failures = [];

        for (const directoryEntry of directoryEntries) {
            const candidatePath = path.join(
                resolvedTemporaryDirectory,
                directoryEntry.name,
            );

            try {
                const candidateStats =
                    await lstat(candidatePath);

                /*
                 * isFile() est faux pour les répertoires et pour les liens
                 * symboliques obtenus avec lstat. Ils sont consignés mais
                 * jamais parcourus ni supprimés.
                 */
                if (!candidateStats.isFile()) {
                    throw new TypeError(
                        "La ressource temporaire doit être un fichier ordinaire.",
                    );
                }

                /*
                 * Un fichier situé exactement sur la limite est conservé.
                 * Seuls les fichiers strictement plus anciens sont supprimés.
                 */
                if (
                    candidateStats.mtimeMs
                    >= orphanThresholdTimestamp
                ) {
                    retained += 1;
                    continue;
                }

                const discardResult =
                    await discardTemporaryFile(
                        candidatePath,
                    );

                if (discardResult.discarded) {
                    discarded += 1;
                } else {
                    /*
                     * Le fichier a pu disparaître entre le parcours et la
                     * suppression à cause d'un autre nettoyage concurrent.
                     */
                    missing += 1;
                }
            } catch (error) {
                if (error.code === "ENOENT") {
                    missing += 1;
                    continue;
                }

                failures.push(
                    createFailureSummary(
                        directoryEntry.name,
                        error,
                    ),
                );
            }
        }

        return Object.freeze({
            inspected: directoryEntries.length,
            discarded,
            retained,
            missing,
            failed: failures.length,
            failures: Object.freeze(failures),
        });
    };


    return Object.freeze({
        discardTemporaryFile,
        purgeOrphanTemporaryFiles,
    });
};


/**
 * Instance utilisée par l'application avec la quarantaine de Multer.
 */
const temporaryFileService =
    createTemporaryFileService({
        temporaryDirectory:
            storageConfig.local.temporaryDirectory,
    });


export {
    createTemporaryFileService,
    temporaryFileService,
};