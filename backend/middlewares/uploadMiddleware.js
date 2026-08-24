import multer from 'multer';

import {
    AUDIT_ACTION,
    AUDIT_STATUS,
} from '../constants/auditActions.constants.js';

import {
    FILE_UPLOAD_REJECTION_REASON,
} from '../constants/fileAudit.constants.js';

import { multerUpload } from '../config/multer.config.js';

import {
    createAuditLog,
} from '../modules/auditLog/auditLog.service.js';

import { AppError } from '../utils/appError.js';


/**
 * Traduit une erreur Multer en erreur HTTP opérationnelle.
 */
const convertMulterError = (error) => {
    if (error.code === 'LIMIT_FILE_SIZE') {
        return new AppError(
            'Le fichier dépasse la taille maximale autorisée.',
            413,
        );
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
        return new AppError(
            'Un seul fichier peut être téléversé par requête.',
            400,
        );
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return new AppError(
            'Le champ de fichier est invalide ou contient trop de fichiers.',
            400,
        );
    }

    if (
        [
            'LIMIT_PART_COUNT',
            'LIMIT_FIELD_COUNT',
            'LIMIT_FIELD_KEY',
            'LIMIT_FIELD_VALUE',
            'LIMIT_FIELD_NESTING',
        ].includes(error.code)
    ) {
        return new AppError(
            'La requête multipart dépasse les limites autorisées.',
            400,
        );
    }

    return new AppError(
        'Le téléversement du fichier est invalide.',
        400,
    );
};


/**
 * Construit le middleware d'upload avec des dépendances injectables.
 *
 * L'injection permet de tester séparément la traduction des erreurs multipart
 * et leur audit sans dépendre d'une écriture réelle sur disque ou en base.
 */
const createUploadSingleFile = ({
    upload,
    createAuditEvent,
}) => {
    if (
        !upload
        || typeof upload.single !== 'function'
        || typeof createAuditEvent !== 'function'
    ) {
        throw new TypeError(
            'Les dépendances du middleware d’upload sont invalides.',
        );
    }

    return (fieldName = 'file') => {
        if (
            typeof fieldName !== 'string'
            || !/^[a-z][a-zA-Z0-9_]*$/.test(fieldName)
        ) {
            throw new TypeError(
                'Le nom du champ de fichier est invalide.',
            );
        }

        const multerMiddleware =
            upload.single(fieldName);

        return (request, response, next) => {
            multerMiddleware(
                request,
                response,
                async (error) => {
                    if (error instanceof AppError) {
                        next(error);
                        return;
                    }

                    if (
                        error
                        instanceof multer.MulterError
                    ) {
                        const convertedError =
                            convertMulterError(error);

                        if (
                            error.code
                            === 'LIMIT_FILE_SIZE'
                        ) {
                            /*
                             * Le rejet intervient avant la création d'un
                             * document File. L'audit est donc rattaché à
                             * l'acteur et au workspace uniquement, sans
                             * entityType ni entityId.
                             *
                             * Multer interrompt le flux à la limite configurée.
                             * La taille complète du fichier n'est donc pas
                             * considérée comme suffisamment fiable pour être
                             * journalisée ici.
                             */
                            try {
                                await createAuditEvent({
                                    actor:
                                        request.user?._id
                                        ?? null,

                                    workspace:
                                        request.workspace?._id
                                        ?? null,

                                    action:
                                        AUDIT_ACTION
                                            .FILE_UPLOAD_REJECTED,

                                    status:
                                        AUDIT_STATUS.FAILED,

                                    ipAddress:
                                        request.context
                                            ?.ipAddress
                                        ?? null,

                                    userAgent:
                                        request.context
                                            ?.userAgent
                                        ?? null,

                                    metadata: {
                                        reason:
                                            FILE_UPLOAD_REJECTION_REASON
                                                .FILE_TOO_LARGE,
                                    },
                                });
                            } catch {
                                /*
                                 * La décision de rejet reste prioritaire sur
                                 * sa journalisation. Une panne de l'AuditLog
                                 * ne doit jamais masquer le 413 initial ni
                                 * transformer l'upload en succès.
                                 */
                            }
                        }

                        next(convertedError);
                        return;
                    }

                    if (error) {
                        /*
                         * Une erreur inconnue peut provenir du système de
                         * fichiers. Elle reste technique et doit être traitée
                         * comme telle par le gestionnaire centralisé.
                         */
                        next(error);
                        return;
                    }

                    if (!request.file) {
                        next(
                            new AppError(
                                'Aucun fichier valide n’a été fourni.',
                                400,
                            ),
                        );
                        return;
                    }

                    next();
                },
            );
        };
    };
};


/**
 * Instance applicative utilisant les dépendances réelles.
 */
const uploadSingleFile =
    createUploadSingleFile({
        upload: multerUpload,
        createAuditEvent: createAuditLog,
    });


export {
    createUploadSingleFile,
    uploadSingleFile,
};