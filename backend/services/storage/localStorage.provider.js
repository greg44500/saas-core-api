import {
    constants as fsConstants,
    createReadStream,
} from 'node:fs';

import {
    copyFile,
    lstat,
    mkdir,
    unlink,
} from 'node:fs/promises';

import path from 'node:path';

import { FILE_STORAGE_PROVIDER } from '../../constants/file.constants.js';
import { storageConfig } from '../../config/storage.config.js';


/**
 * Vérifie qu'un chemin se trouve strictement à l'intérieur d'un répertoire.
 */
const isPathInside = (parentDirectory, candidatePath) => {
    const relativePath = path.relative(
        parentDirectory,
        candidatePath,
    );

    return (
        relativePath !== ''
        && !relativePath.startsWith('..')
        && !path.isAbsolute(relativePath)
    );
};


/**
 * Valide une clé de stockage interne.
 *
 * Les clés utilisent toujours "/" comme séparateur afin de conserver le même
 * format pour le stockage local et le futur stockage S3.
 */
const validateStorageKey = (storageKey) => {
    if (
        typeof storageKey !== 'string'
        || storageKey.length === 0
        || storageKey.trim() !== storageKey
        || storageKey.includes('\0')
        || storageKey.includes('\\')
        || storageKey.startsWith('/')
    ) {
        throw new TypeError('La clé de stockage est invalide.');
    }

    const segments = storageKey.split('/');

    if (
        segments.some((segment) =>
            segment === ''
            || segment === '.'
            || segment === '..',
        )
    ) {
        throw new TypeError('La clé de stockage est invalide.');
    }
};


/**
 * Crée un fournisseur de stockage local.
 *
 * L'utilisation d'une factory permet aux tests d'injecter leurs propres
 * répertoires temporaires sans écrire dans le stockage réel de l'application.
 */
const createLocalStorageProvider = ({
    rootDirectory,
    temporaryDirectory,
}) => {
    if (
        typeof rootDirectory !== 'string'
        || typeof temporaryDirectory !== 'string'
    ) {
        throw new TypeError(
            'Les répertoires du stockage local sont obligatoires.',
        );
    }

    const resolvedRootDirectory = path.resolve(rootDirectory);
    const resolvedTemporaryDirectory =
        path.resolve(temporaryDirectory);


    /**
     * Transforme une clé contrôlée en chemin physique contenu dans la racine.
     */
    const resolveStoragePath = (storageKey) => {
        validateStorageKey(storageKey);

        const targetPath = path.resolve(
            resolvedRootDirectory,
            ...storageKey.split('/'),
        );

        if (!isPathInside(resolvedRootDirectory, targetPath)) {
            throw new TypeError(
                'La clé de stockage sort du répertoire autorisé.',
            );
        }

        return targetPath;
    };


    /**
     * Vérifie que Multer fournit bien un fichier issu de la quarantaine.
     *
     * Le service ne doit jamais pouvoir déplacer arbitrairement un fichier
     * présent ailleurs sur le serveur.
     */
    const resolveTemporarySourcePath = (sourcePath) => {
        if (
            typeof sourcePath !== 'string'
            || sourcePath.length === 0
        ) {
            throw new TypeError(
                'Le chemin du fichier temporaire est obligatoire.',
            );
        }

        const resolvedSourcePath = path.resolve(sourcePath);

        if (
            !isPathInside(
                resolvedTemporaryDirectory,
                resolvedSourcePath,
            )
        ) {
            throw new TypeError(
                "Le fichier source n'appartient pas au répertoire temporaire.",
            );
        }

        return resolvedSourcePath;
    };


    /**
     * Prépare les répertoires nécessaires.
     *
     * Cette opération est idempotente et pourra être appelée au démarrage.
     */
    const initialize = async () => {
        await Promise.all([
            mkdir(resolvedRootDirectory, {
                recursive: true,
            }),
            mkdir(resolvedTemporaryDirectory, {
                recursive: true,
            }),
        ]);
    };


    /**
     * Déplace logiquement un fichier de la quarantaine vers son emplacement
     * définitif.
     *
     * COPYFILE_EXCL interdit l'écrasement silencieux d'un fichier existant.
     * La copie, puis la suppression, fonctionne également si les deux
     * répertoires se trouvent sur des volumes différents.
     */
    const storeFromTemporaryPath = async ({
        sourcePath,
        storageKey,
    }) => {
        const resolvedSourcePath =
            resolveTemporarySourcePath(sourcePath);

        const targetPath = resolveStoragePath(storageKey);

        const sourceStats = await lstat(resolvedSourcePath);

        if (!sourceStats.isFile()) {
            throw new TypeError(
                'La source temporaire doit être un fichier ordinaire.',
            );
        }

        await mkdir(path.dirname(targetPath), {
            recursive: true,
        });

        await copyFile(
            resolvedSourcePath,
            targetPath,
            fsConstants.COPYFILE_EXCL,
        );

        try {
            await unlink(resolvedSourcePath);
        } catch (error) {
            /*
             * Si la suppression de la source échoue, la copie définitive est
             * retirée afin de ne pas laisser deux états contradictoires.
             */
            await unlink(targetPath).catch(() => undefined);
            throw error;
        }

        return {
            storageKey,
        };
    };


    /**
     * Supprime le contenu physique.
     *
     * Une absence est considérée comme un résultat idempotent : le contenu
     * demandé n'est déjà plus présent.
     */
    const deleteFile = async ({ storageKey }) => {
        const targetPath = resolveStoragePath(storageKey);

        try {
            await unlink(targetPath);

            return {
                deleted: true,
            };
        } catch (error) {
            if (error.code === 'ENOENT') {
                return {
                    deleted: false,
                };
            }

            throw error;
        }
    };


    /**
     * Ouvre un flux de lecture sans exposer le chemin physique au contrôleur.
     */
    const createFileReadStream = async ({ storageKey }) => {
        const targetPath = resolveStoragePath(storageKey);
        const targetStats = await lstat(targetPath);

        if (!targetStats.isFile()) {
            throw new TypeError(
                'La ressource de stockage demandée n’est pas un fichier ordinaire.',
            );
        }

        return createReadStream(targetPath);
    };


    return Object.freeze({
        provider: FILE_STORAGE_PROVIDER.LOCAL,
        initialize,
        storeFromTemporaryPath,
        deleteFile,
        createFileReadStream,
    });
};


const localStorageProvider = createLocalStorageProvider({
    rootDirectory:
        storageConfig.local.rootDirectory,
    temporaryDirectory:
        storageConfig.local.temporaryDirectory,
});


export {
    createLocalStorageProvider,
    localStorageProvider,
};