import path from 'node:path';

import { env } from './env.js';


/**
 * Détermine si deux chemins sont identiques ou si candidate est contenu
 * dans parent.
 */
const isSameOrNestedPath = (parent, candidate) => {
    const relativePath = path.relative(parent, candidate);

    return (
        relativePath === ''
        || (
            !relativePath.startsWith('..')
            && !path.isAbsolute(relativePath)
        )
    );
};


/**
 * Les chemins relatifs sont résolus depuis le répertoire de lancement.
 *
 * Les scripts npm du projet démarrent actuellement le backend depuis la
 * racine du dépôt. En production, une valeur absolue pourra cibler directement
 * un volume persistant monté sur le serveur.
 */
const localRootDirectory = path.resolve(
    process.cwd(),
    env.LOCAL_STORAGE_ROOT_DIR,
);

const uploadTempDirectory = path.resolve(
    process.cwd(),
    env.UPLOAD_TEMP_DIR,
);


/**
 * La quarantaine et le stockage définitif doivent être séparés.
 *
 * Cette vérification empêche notamment de configurer tmp à l'intérieur du
 * stockage définitif, ou le stockage définitif à l'intérieur de tmp.
 */
if (
    isSameOrNestedPath(localRootDirectory, uploadTempDirectory)
    || isSameOrNestedPath(uploadTempDirectory, localRootDirectory)
) {
    throw new Error(
        'Le stockage définitif et le répertoire temporaire doivent être séparés.',
    );
}


const storageConfig = Object.freeze({
    provider: env.FILE_STORAGE_PROVIDER,

    local: Object.freeze({
        rootDirectory: localRootDirectory,
        temporaryDirectory: uploadTempDirectory,

        /*
         * La conversion est centralisée ici afin que les services manipulent
         * toujours des millisecondes, unité utilisée par les timestamps Node.js.
         */
        temporaryFileMaximumAgeMs:
            env.UPLOAD_TEMP_FILE_MAX_AGE_MINUTES
            * 60
            * 1000,
    }),
});


export { storageConfig };