import {
    access,
    mkdtemp,
    readFile,
    rm,
    writeFile,
} from 'node:fs/promises';

import { tmpdir } from 'node:os';
import path from 'node:path';

import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import {
    createLocalStorageProvider,
} from '../../services/storage/localStorage.provider.js';


describe('Local storage provider', () => {
    let testDirectory;
    let rootDirectory;
    let temporaryDirectory;
    let storageProvider;


    beforeEach(async () => {
        /**
         * Chaque test possède son propre espace isolé dans le répertoire
         * temporaire du système, y compris sous Windows.
         */
        testDirectory = await mkdtemp(
            path.join(
                tmpdir(),
                'saas-core-local-storage-',
            ),
        );

        rootDirectory = path.join(
            testDirectory,
            'files',
        );

        temporaryDirectory = path.join(
            testDirectory,
            'tmp',
        );

        storageProvider = createLocalStorageProvider({
            rootDirectory,
            temporaryDirectory,
        });

        await storageProvider.initialize();
    });


    afterEach(async () => {
        /**
         * Le dossier est limité à celui créé par mkdtemp pour ce test.
         */
        await rm(testDirectory, {
            recursive: true,
            force: true,
        });
    });


    it('stocke un fichier temporaire sans conserver la source', async () => {
        const sourcePath = path.join(
            temporaryDirectory,
            'temporary-upload',
        );

        const storageKey =
            'workspaces/workspace-1/document.pdf';

        const expectedContent =
            Buffer.from('contenu de test');

        await writeFile(sourcePath, expectedContent);

        const result =
            await storageProvider.storeFromTemporaryPath({
                sourcePath,
                storageKey,
            });

        expect(result).toEqual({
            storageKey,
        });

        const storedContent = await readFile(
            path.join(
                rootDirectory,
                'workspaces',
                'workspace-1',
                'document.pdf',
            ),
        );

        expect(storedContent).toEqual(expectedContent);

        await expect(access(sourcePath)).rejects.toMatchObject({
            code: 'ENOENT',
        });
    });


    it('rend la suppression physique idempotente', async () => {
        const sourcePath = path.join(
            temporaryDirectory,
            'temporary-upload',
        );

        const storageKey =
            'workspaces/workspace-1/document.pdf';

        await writeFile(
            sourcePath,
            Buffer.from('contenu de test'),
        );

        await storageProvider.storeFromTemporaryPath({
            sourcePath,
            storageKey,
        });

        await expect(
            storageProvider.deleteFile({
                storageKey,
            }),
        ).resolves.toEqual({
            deleted: true,
        });

        /**
         * Une seconde demande ne doit pas provoquer d'erreur :
         * le résultat recherché, l'absence du fichier, est déjà atteint.
         */
        await expect(
            storageProvider.deleteFile({
                storageKey,
            }),
        ).resolves.toEqual({
            deleted: false,
        });
    });


    it('refuse une clé tentant de sortir du stockage autorisé', async () => {
        const sourcePath = path.join(
            temporaryDirectory,
            'temporary-upload',
        );

        await writeFile(
            sourcePath,
            Buffer.from('contenu de test'),
        );

        await expect(
            storageProvider.storeFromTemporaryPath({
                sourcePath,
                storageKey: '../../outside.pdf',
            }),
        ).rejects.toThrow(
            'La clé de stockage est invalide.',
        );

        /**
         * Le fichier temporaire doit rester disponible pour permettre au
         * service appelant d'exécuter sa stratégie de nettoyage.
         */
        await expect(access(sourcePath))
            .resolves.toBeUndefined();

        await expect(
            access(
                path.join(
                    testDirectory,
                    'outside.pdf',
                ),
            ),
        ).rejects.toMatchObject({
            code: 'ENOENT',
        });
    });
});