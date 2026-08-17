import multer from 'multer';

import { multerUpload } from '../config/multer.config.js';
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
 * Crée un middleware acceptant exactement un fichier dans le champ indiqué.
 *
 * Multer reste limité aux routes qui en ont explicitement besoin ; il ne doit
 * jamais être monté comme middleware global de l'application.
 */
const uploadSingleFile = (fieldName = 'file') => {
    if (
        typeof fieldName !== 'string'
        || !/^[a-z][a-zA-Z0-9_]*$/.test(fieldName)
    ) {
        throw new TypeError(
            'Le nom du champ de fichier est invalide.',
        );
    }

    const multerMiddleware =
        multerUpload.single(fieldName);

    return (request, response, next) => {
        multerMiddleware(
            request,
            response,
            (error) => {
                if (error instanceof AppError) {
                    next(error);
                    return;
                }

                if (error instanceof multer.MulterError) {
                    next(convertMulterError(error));
                    return;
                }

                if (error) {
                    /**
                     * Une erreur inconnue peut provenir du système de fichiers.
                     * Elle reste technique et doit être traitée comme telle par
                     * le gestionnaire d'erreurs centralisé.
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


export { uploadSingleFile };