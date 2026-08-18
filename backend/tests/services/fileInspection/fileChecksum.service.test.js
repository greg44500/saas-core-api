import {
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
    calculateFileSha256,
} from "../../../services/fileInspection/fileChecksum.service.js";

describe("calculateFileSha256", () => {
    let testDirectory;

    beforeEach(async () => {
        /*
         * Chaque test travaille dans un répertoire créé par le système.
         * Aucun contenu de test ne doit atteindre la véritable quarantaine
         * utilisée par Multer.
         */
        testDirectory = await mkdtemp(
            path.join(
                tmpdir(),
                "saas-core-file-checksum-",
            ),
        );
    });

    afterEach(async () => {
        /*
         * La suppression reste strictement limitée au répertoire dont le
         * chemin a été retourné par mkdtemp pour le test courant.
         */
        await rm(testDirectory, {
            recursive: true,
            force: true,
        });
    });

    it("calcule l'empreinte SHA-256 exacte du contenu binaire", async () => {
        const filePath = path.join(
            testDirectory,
            "temporary-upload",
        );

        await writeFile(
            filePath,
            Buffer.from("abc", "utf8"),
        );

        /*
         * Ce vecteur connu est inscrit explicitement afin de ne pas calculer
         * le résultat attendu avec la même API que celle soumise au test.
         * Le test détectera ainsi un changement d'algorithme ou d'encodage.
         */
        await expect(
            calculateFileSha256(filePath),
        ).resolves.toBe(
            "ba7816bf8f01cfea414140de5dae2223"
            + "b00361a396177a9cb410ff61f20015ad",
        );
    });

    it("propage une erreur lorsque le fichier ne peut pas être lu", async () => {
        const missingFilePath = path.join(
            testDirectory,
            "missing-file",
        );

        /*
         * Le service ne fabrique aucun checksum de remplacement.
         * L'orchestration devra recevoir l'échec et nettoyer le fichier
         * temporaire ou annuler l'upload.
         */
        await expect(
            calculateFileSha256(missingFilePath),
        ).rejects.toMatchObject({
            code: "ENOENT",
        });
    });

    it("refuse un chemin vide avant d'ouvrir un flux", async () => {
        await expect(
            calculateFileSha256(""),
        ).rejects.toThrow(
            "Le chemin du fichier à hacher est obligatoire.",
        );
    });
});