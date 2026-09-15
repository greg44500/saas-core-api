import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
    afterEach,
    describe,
    expect,
    it,
} from 'vitest';

import {
    createLocalStorageProvider,
} from '../../services/storage/localStorage.provider.js';

const temporaryDirectories = [];

const createTestProvider = async () => {
    const baseDirectory = await mkdtemp(
        path.join(tmpdir(), 'saas-core-storage-'),
    );
    temporaryDirectories.push(baseDirectory);

    const rootDirectory = path.join(baseDirectory, 'files');
    const temporaryDirectory = path.join(baseDirectory, 'tmp');
    const provider = createLocalStorageProvider({
        rootDirectory,
        temporaryDirectory,
    });

    await provider.initialize();

    return {
        provider,
        rootDirectory,
    };
};

afterEach(async () => {
    await Promise.all(
        temporaryDirectories.splice(0).map((directory) =>
            rm(directory, {
                recursive: true,
                force: true,
            }),
        ),
    );
});

describe('localStorageProvider.fileExists', () => {
    it('confirme la présence d’un fichier ordinaire dans le stockage', async () => {
        const {
            provider,
            rootDirectory,
        } = await createTestProvider();

        const storageDirectory = path.join(
            rootDirectory,
            'workspace-id',
        );
        await mkdir(storageDirectory, { recursive: true });
        await writeFile(
            path.join(storageDirectory, 'file-id.pdf'),
            'contenu',
        );

        await expect(provider.fileExists({
            storageKey: 'workspace-id/file-id.pdf',
        })).resolves.toBe(true);
    });

    it('retourne false lorsque le contenu physique a déjà disparu', async () => {
        const { provider } = await createTestProvider();

        await expect(provider.fileExists({
            storageKey: 'workspace-id/missing.pdf',
        })).resolves.toBe(false);
    });

    it('refuse une clé qui tente de sortir du répertoire de stockage', async () => {
        const { provider } = await createTestProvider();

        await expect(provider.fileExists({
            storageKey: '../outside.pdf',
        })).rejects.toThrow('La clé de stockage est invalide.');
    });
});
