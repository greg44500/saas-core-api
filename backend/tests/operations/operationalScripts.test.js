import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    describe,
    expect,
    it,
} from 'vitest';

const currentFilePath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(
    path.dirname(currentFilePath),
    '../../..',
);

const readPackageScripts = async () => {
    const packageJson = JSON.parse(
        await readFile(
            path.join(projectRoot, 'package.json'),
            'utf8',
        ),
    );

    return Object.values(packageJson.scripts ?? {});
};

const extractNodeScriptPath = (command) => {
    const match = /^node\s+([^\s]+)$/.exec(command.trim());

    return match?.[1] ?? null;
};

const listExecutableFiles = async ({ directory, predicate }) => {
    const entries = await readdir(
        path.join(projectRoot, directory),
        { withFileTypes: true },
    );

    return entries
        .filter((entry) => entry.isFile() && predicate(entry.name))
        .map((entry) => `${directory}/${entry.name}`)
        .sort();
};

describe('scripts npm d’exploitation', () => {
    it('expose chaque runner de migration via package.json', async () => {
        const commands = await readPackageScripts();
        const exposedPaths = commands
            .map(extractNodeScriptPath)
            .filter(Boolean);

        const migrationRunners = await listExecutableFiles({
            directory: 'backend/migrations',
            predicate: (name) => (
                name.startsWith('run')
                && name.endsWith('Migration.js')
            ),
        });

        expect(
            migrationRunners.filter(
                (runner) => !exposedPaths.includes(runner),
            ),
        ).toEqual([]);
    });

    it('expose chaque seed exécutable via package.json', async () => {
        const commands = await readPackageScripts();
        const exposedPaths = commands
            .map(extractNodeScriptPath)
            .filter(Boolean);

        const seeds = await listExecutableFiles({
            directory: 'backend/seeds',
            predicate: (name) => name.endsWith('.js'),
        });

        expect(
            seeds.filter(
                (seed) => !exposedPaths.includes(seed),
            ),
        ).toEqual([]);
    });
});
