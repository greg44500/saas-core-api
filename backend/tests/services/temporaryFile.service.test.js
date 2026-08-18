import {
    access,
    mkdir,
    mkdtemp,
    rm,
    writeFile,
} from "node:fs/promises";

import { tmpdir } from "node:os";
import path from "node:path";

import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";

import {
    createTemporaryFileService,
} from "../../services/storage/temporaryFile.service.js";

describe("Temporary file service", () => {
    let testDirectory;
    let temporaryDirectory;
    let temporaryFileService;

    beforeEach(async () => {
        /*
         * Le répertoire parent permet de créer à la fois une quarantaine
         * autorisée et des ressources extérieures utilisées pour vérifier
         * qu'aucune suppression ne peut sortir de cette frontière.
         */
        testDirectory = await mkdtemp(
            path.join(
                tmpdir(),
                "saas-core-temporary-file-",
            ),
        );

        temporaryDirectory = path.join(
            testDirectory,
            "uploads-tmp",
        );

        await mkdir(temporaryDirectory);

        temporaryFileService =
            createTemporaryFileService({
                temporaryDirectory,
            });
    });

    afterEach(async () => {
        /*
         * Seul le répertoire explicitement créé pour le test courant est
         * supprimé. Cette opération ne passe pas par le service testé.
         */
        await rm(testDirectory, {
            recursive: true,
            force: true,
        });
    });

    it("détruit un fichier appartenant au répertoire temporaire", async () => {
        const filePath = path.join(
            temporaryDirectory,
            "temporary-upload",
        );

        await writeFile(
            filePath,
            Buffer.from("contenu temporaire"),
        );

        await expect(
            temporaryFileService
                .discardTemporaryFile(filePath),
        ).resolves.toEqual({
            discarded: true,
        });

        await expect(
            access(filePath),
        ).rejects.toMatchObject({
            code: "ENOENT",
        });
    });

    it("rend le nettoyage idempotent lorsque le fichier a déjà disparu", async () => {
        const missingFilePath = path.join(
            temporaryDirectory,
            "missing-upload",
        );

        await expect(
            temporaryFileService
                .discardTemporaryFile(
                    missingFilePath,
                ),
        ).resolves.toEqual({
            discarded: false,
        });
    });

    it("refuse de supprimer un fichier extérieur à la quarantaine", async () => {
        const outsideFilePath = path.join(
            testDirectory,
            "outside-file",
        );

        await writeFile(
            outsideFilePath,
            Buffer.from("ne doit pas être supprimé"),
        );

        await expect(
            temporaryFileService
                .discardTemporaryFile(
                    outsideFilePath,
                ),
        ).rejects.toThrow(
            "Le fichier à supprimer n'appartient pas au répertoire temporaire.",
        );

        /*
         * L'échec attendu doit laisser la ressource extérieure intacte.
         */
        await expect(
            access(outsideFilePath),
        ).resolves.toBeUndefined();
    });

    it("refuse de supprimer un répertoire situé dans la quarantaine", async () => {
        const nestedDirectory = path.join(
            temporaryDirectory,
            "nested-directory",
        );

        await mkdir(nestedDirectory);

        await expect(
            temporaryFileService
                .discardTemporaryFile(
                    nestedDirectory,
                ),
        ).rejects.toThrow(
            "La ressource temporaire doit être un fichier ordinaire.",
        );

        await expect(
            access(nestedDirectory),
        ).resolves.toBeUndefined();
    });
});