import path from "node:path";

import { fileTypeFromFile } from "file-type";

import { ALLOWED_FILE_TYPES } from "../../constants/file.constants.js";
import { AppError } from "../../utils/appError.js";

/**
 * Recherche la définition autorisée correspondant au type réellement détecté.
 *
 * Nous vérifions à la fois le type MIME et l'extension détectés par file-type.
 * Le type déclaré par le navigateur n'est jamais utilisé comme preuve.
 */
const findAllowedFileType = ({ mime, ext }) => {
    return Object.values(ALLOWED_FILE_TYPES).find(
        ({ mimeType, extensions }) =>
            mimeType === mime && extensions.includes(ext),
    );
};

/**
 * Analyse le type réel d'un fichier temporaire à partir de sa signature binaire.
 *
 * Le fichier reste dans le répertoire temporaire :
 * ce service ne le déplace pas, ne le supprime pas et ne l'active pas.
 * Le nettoyage sera géré par le futur service d'orchestration de l'upload.
 */
export const inspectUploadedFileType = async ({
    filePath,
    originalName,
    declaredMimeType,
}) => {
    const detectedFileType = await fileTypeFromFile(filePath);

    if (!detectedFileType) {
        throw new AppError(
            "Le type réel du fichier n'a pas pu être identifié.",
            415,
        );
    }

    const allowedFileType = findAllowedFileType(detectedFileType);

    if (!allowedFileType) {
        throw new AppError(
            "Le type réel du fichier n'est pas autorisé.",
            415,
        );
    }

    /*
     * Un type déclaré différent du contenu réel peut signaler un fichier
     * mal nommé, une erreur du client ou une tentative de contournement.
     */
    if (declaredMimeType !== detectedFileType.mime) {
        throw new AppError(
            "Le type déclaré du fichier ne correspond pas à son contenu.",
            415,
        );
    }

    const originalExtension = path
        .extname(originalName)
        .slice(1)
        .toLowerCase();

    /*
     * JPEG accepte les deux extensions usuelles : .jpg et .jpeg.
     * Pour les autres formats, l'extension doit également correspondre
     * à la définition autorisée.
     */
    if (!allowedFileType.extensions.includes(originalExtension)) {
        throw new AppError(
            "L'extension du fichier ne correspond pas à son contenu.",
            415,
        );
    }

    return Object.freeze({
        mimeType: detectedFileType.mime,
        extension: detectedFileType.ext,
    });
};