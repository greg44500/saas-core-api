import {
    access,
    mkdir,
    mkdtemp,
    rm,
    utimes,
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


const CURRENT_TIMESTAMP =
    Date.UTC(2026, 7, 19, 10, 0, 0);

const ONE_HOUR_MS =
    60 * 60 * 1000;


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

                /*
                 * Une horloge fixe évite que les tests dépendent de leur durée
                 * d'exécution ou de l'heure réelle de la machine.
                 */
                currentTime: () =>
                    CURRENT_TIMESTAMP,
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


    it("supprime uniquement les fichiers plus anciens que la durée minimale", async () => {
        const orphanFilePath = path.join(
            temporaryDirectory,
            "orphan-upload",
        );

        const recentFilePath = path.join(
            temporaryDirectory,
            "recent-upload",
        );

        await writeFile(
            orphanFilePath,
            Buffer.from("ancien fichier"),
        );

        await writeFile(
            recentFilePath,
            Buffer.from("fichier récent"),
        );

        /*
         * Le premier fichier date de deux heures : il dépasse la durée d'une
         * heure. Le second ne date que de trente minutes et doit être conservé.
         */
        const orphanDate = new Date(
            CURRENT_TIMESTAMP - (2 * ONE_HOUR_MS),
        );

        const recentDate = new Date(
            CURRENT_TIMESTAMP - (30 * 60 * 1000),
        );

        await utimes(
            orphanFilePath,
            orphanDate,
            orphanDate,
        );

        await utimes(
            recentFilePath,
            recentDate,
            recentDate,
        );

        await expect(
            temporaryFileService
                .purgeOrphanTemporaryFiles({
                    minimumAgeMs: ONE_HOUR_MS,
                }),
        ).resolves.toEqual({
            inspected: 2,
            discarded: 1,
            retained: 1,
            missing: 0,
            failed: 0,
            failures: [],
        });

        await expect(
            access(orphanFilePath),
        ).rejects.toMatchObject({
            code: "ENOENT",
        });

        await expect(
            access(recentFilePath),
        ).resolves.toBeUndefined();
    });


    it("conserve un fichier situé exactement sur la limite d'âge", async () => {
        const boundaryFilePath = path.join(
            temporaryDirectory,
            "boundary-upload",
        );

        await writeFile(
            boundaryFilePath,
            Buffer.from("fichier à la limite"),
        );

        const boundaryDate = new Date(
            CURRENT_TIMESTAMP - ONE_HOUR_MS,
        );

        await utimes(
            boundaryFilePath,
            boundaryDate,
            boundaryDate,
        );

        await expect(
            temporaryFileService
                .purgeOrphanTemporaryFiles({
                    minimumAgeMs: ONE_HOUR_MS,
                }),
        ).resolves.toEqual({
            inspected: 1,
            discarded: 0,
            retained: 1,
            missing: 0,
            failed: 0,
            failures: [],
        });

        await expect(
            access(boundaryFilePath),
        ).resolves.toBeUndefined();
    });


    it("refuse une durée inférieure au garde-fou de cinq minutes", async () => {
        await expect(
            temporaryFileService
                .purgeOrphanTemporaryFiles({
                    minimumAgeMs: 60 * 1000,
                }),
        ).rejects.toThrow(
            "L'âge minimal d'un fichier orphelin doit être un entier d'au moins cinq minutes.",
        );
    });


    it("poursuit la purge lorsqu'une ressource anormale est rencontrée", async () => {
        const orphanFilePath = path.join(
            temporaryDirectory,
            "orphan-upload",
        );

        const unexpectedDirectoryPath = path.join(
            temporaryDirectory,
            "unexpected-directory",
        );

        await writeFile(
            orphanFilePath,
            Buffer.from("ancien fichier"),
        );

        await mkdir(unexpectedDirectoryPath);

        const orphanDate = new Date(
            CURRENT_TIMESTAMP - (2 * ONE_HOUR_MS),
        );

        await utimes(
            orphanFilePath,
            orphanDate,
            orphanDate,
        );

        const result = await temporaryFileService
            .purgeOrphanTemporaryFiles({
                minimumAgeMs: ONE_HOUR_MS,
            });

        expect(result).toMatchObject({
            inspected: 2,
            discarded: 1,
            retained: 0,
            missing: 0,
            failed: 1,
        });

        expect(result.failures).toEqual([
            {
                fileName: "unexpected-directory",
                code: null,
                message:
                    "La ressource temporaire doit être un fichier ordinaire.",
            },
        ]);

        /*
         * L'anomalie est signalée mais elle n'empêche pas la suppression du
         * véritable fichier orphelin et n'est elle-même jamais supprimée.
         */
        await expect(
            access(orphanFilePath),
        ).rejects.toMatchObject({
            code: "ENOENT",
        });

        await expect(
            access(unexpectedDirectoryPath),
        ).resolves.toBeUndefined();
    });


    it("refuse une source de temps retournant une valeur invalide", async () => {
        const serviceWithInvalidClock =
            createTemporaryFileService({
                temporaryDirectory,
                currentTime: () => Number.NaN,
            });

        await expect(
            serviceWithInvalidClock
                .purgeOrphanTemporaryFiles({
                    minimumAgeMs: ONE_HOUR_MS,
                }),
        ).rejects.toThrow(
            "La source de temps doit retourner un timestamp valide.",
        );
    });
});