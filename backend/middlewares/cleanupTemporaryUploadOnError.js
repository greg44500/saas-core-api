import {
    temporaryFileService,
} from '../services/storage/temporaryFile.service.js';


/**
 * Construit la barrière de nettoyage placée après une route d'upload.
 *
 * La factory permet de simuler la suppression dans les tests. Le middleware
 * reste ainsi vérifiable sans écrire ni supprimer de véritable fichier dans
 * la quarantaine.
 */
const createCleanupTemporaryUploadOnError = ({
    discardTemporaryFile,
}) => {
    if (typeof discardTemporaryFile !== 'function') {
        throw new TypeError(
            'La dépendance de nettoyage du fichier temporaire est invalide.',
        );
    }

    /**
     * Nettoie le temporaire lorsqu'une erreur interrompt la chaîne HTTP après
     * le passage de Multer.
     *
     * Ce middleware possède volontairement quatre paramètres : Express le
     * reconnaît ainsi comme un middleware de gestion d'erreur. Sans req.file,
     * aucune ressource temporaire n'a été créée par la route et l'erreur peut
     * être transmise immédiatement au gestionnaire centralisé.
     */
    return async function cleanupTemporaryUploadOnError(
        error,
        request,
        response,
        next,
    ) {
        const temporaryFilePath =
            request.file?.path;

        if (
            typeof temporaryFilePath !== 'string'
            || temporaryFilePath.trim() === ''
        ) {
            next(error);
            return;
        }

        try {
            await discardTemporaryFile(
                temporaryFilePath,
            );
        } catch (cleanupError) {
            /*
             * L'erreur initiale explique pourquoi la requête a échoué ; la
             * seconde signale qu'un fichier peut être resté en quarantaine.
             * Les conserver ensemble est indispensable au diagnostic et à
             * la future supervision opérationnelle.
             */
            next(
                new AggregateError(
                    [
                        error,
                        cleanupError,
                    ],
                    'La requête d’upload et le nettoyage du fichier temporaire ont échoué.',
                    {
                        cause: error,
                    },
                ),
            );

            return;
        }

        /*
         * Le nettoyage réussi ne transforme pas l'échec en succès. L'erreur
         * initiale poursuit son chemin vers errorHandler afin de conserver le
         * statut HTTP et le message opérationnel prévus par la couche fautive.
         */
        next(error);
    };
};


/**
 * Instance applicative utilisant la quarantaine configurée pour Multer.
 */
const cleanupTemporaryUploadOnError =
    createCleanupTemporaryUploadOnError({
        discardTemporaryFile: (filePath) =>
            temporaryFileService
                .discardTemporaryFile(filePath),
    });


export {
    cleanupTemporaryUploadOnError,
    createCleanupTemporaryUploadOnError,
};