import { randomUUID } from 'node:crypto';

import multer from 'multer';

import {
    ALLOWED_FILE_MIME_TYPES,
} from '../constants/file.constants.js';

import { storageConfig } from './storage.config.js';
import { env } from './env.js';

import {
    FILE_UPLOAD_REJECTION_REASON,
} from '../constants/fileAudit.constants.js';

import {
    fileUploadRejectedError,
} from '../modules/file/fileUploadRejected.error.js';


/**
 * Stocke temporairement les fichiers sur disque.
 *
 * Le nom d'origine n'est jamais utilisé comme nom physique. Aucune extension
 * n'est ajoutée avant que le type réel du contenu ait été identifié.
 */
const temporaryDiskStorage = multer.diskStorage({
    destination: storageConfig.local.temporaryDirectory,

    filename: (request, file, callback) => {
        callback(null, randomUUID());
    },
});


/**
 * Effectue un premier filtrage sur le type déclaré par le client.
 *
 * Ce contrôle réduit les uploads manifestement hors périmètre, mais ne
 * constitue pas une preuve du type réel. Une seconde validation analysera
 * obligatoirement le contenu binaire après réception.
 */
const preliminaryMimeTypeFilter = (
    request,
    file,
    callback,
) => {
    const declaredMimeType =
        file.mimetype?.trim().toLowerCase();

    if (
        !ALLOWED_FILE_MIME_TYPES.includes(
            declaredMimeType,
        )
    ) {
        callback(
            new fileUploadRejectedError(
                'Le type de fichier déclaré n’est pas autorisé.',
                415,
                FILE_UPLOAD_REJECTION_REASON
                    .FILE_TYPE_NOT_ALLOWED,
            ),
        );

        return;
    }

    callback(null, true);
};


/**
 * Configuration multipart limitée à un fichier par requête.
 *
 * Les limites complémentaires protègent également les champs texte et le
 * nombre total de parties contre des requêtes multipart excessives.
 */
const multerUpload = multer({
    storage: temporaryDiskStorage,
    fileFilter: preliminaryMimeTypeFilter,

    limits: {
        fileSize: env.UPLOAD_MAX_FILE_SIZE_BYTES,
        files: 1,
        fields: 5,
        parts: 6,
        fieldNameSize: 100,
        fieldSize: 16 * 1024,
        headerPairs: 100,
        fieldNestingDepth: 0,
    },

    preservePath: false,
    defParamCharset: 'utf8',
});


export { multerUpload };