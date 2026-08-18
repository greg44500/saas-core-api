import {
    lstat,
    unlink,
} from "node:fs/promises";

import path from "node:path";

import {
    storageConfig,
} from "../../config/storage.config.js";

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
 * Construit le service responsable des fichiers temporaires de l'upload.
 *
 * Cette responsabilité reste séparée du stockage définitif : un fichier
 * rejeté n'a encore aucun fournisseur permanent et doit pouvoir être détruit
 * sans inventer une storageKey ou un document File.
 *
 * La factory permet aux tests d'utiliser une quarantaine isolée sans toucher
 * au répertoire réellement configuré pour Multer.
 */
const createTemporaryFileService = ({
    temporaryDirectory,
}) => {
    if (
        typeof temporaryDirectory !== "string"
        || temporaryDirectory.trim() === ""
    ) {
        throw new TypeError(
            "Le répertoire temporaire est obligatoire.",
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

    return Object.freeze({
        discardTemporaryFile,
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