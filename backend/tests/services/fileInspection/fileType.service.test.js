import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { inspectUploadedFileType } from "../../../services/fileInspection/fileType.service.js";

describe("inspectUploadedFileType", () => {
    let testDirectory;

    /*
     * Chaque test utilise son propre répertoire temporaire afin de ne jamais
     * écrire dans le véritable répertoire d'upload de l'application.
     */
    beforeEach(async () => {
        testDirectory = await mkdtemp(
            path.join(tmpdir(), "saas-core-file-type-"),
        );
    });

    afterEach(async () => {
        await rm(testDirectory, {
            recursive: true,
            force: true,
        });
    });

    const createTemporaryFile = async (fileName, content) => {
        const filePath = path.join(testDirectory, fileName);

        await writeFile(filePath, content);

        return filePath;
    };

    it("accepte un fichier PNG dont le contenu, le MIME et l'extension correspondent", async () => {
        /*
         * Image PNG valide de 1 × 1 pixel.
         * Le type doit être identifié depuis son contenu binaire.
         */
        const pngBuffer = Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZzT8AAAAASUVORK5CYII=",
            "base64",
        );

        const filePath = await createTemporaryFile(
            "temporary-upload",
            pngBuffer,
        );

        await expect(
            inspectUploadedFileType({
                filePath,
                originalName: "illustration.png",
                declaredMimeType: "image/png",
            }),
        ).resolves.toEqual({
            mimeType: "image/png",
            extension: "png",
        });
    });

    it("refuse un contenu dont le type réel ne peut pas être identifié", async () => {
        const filePath = await createTemporaryFile(
            "temporary-upload",
            Buffer.from("simple fichier texte"),
        );

        await expect(
            inspectUploadedFileType({
                filePath,
                originalName: "document.pdf",
                declaredMimeType: "application/pdf",
            }),
        ).rejects.toMatchObject({
            statusCode: 415,
            message: "Le type réel du fichier n'a pas pu être identifié.",
        });
    });

    it("refuse un type réel identifiable mais absent de la liste autorisée", async () => {
        /*
         * Signature GIF89a : le format est identifiable, mais GIF ne fait pas
         * partie des formats autorisés dans ALLOWED_FILE_TYPES.
         */
        const filePath = await createTemporaryFile(
            "temporary-upload",
            Buffer.from("GIF89a", "ascii"),
        );

        await expect(
            inspectUploadedFileType({
                filePath,
                originalName: "animation.gif",
                declaredMimeType: "image/gif",
            }),
        ).rejects.toMatchObject({
            statusCode: 415,
            message: "Le type réel du fichier n'est pas autorisé.",
        });
    });

    it("refuse un type MIME déclaré différent du contenu réel", async () => {
        const pngBuffer = Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZzT8AAAAASUVORK5CYII=",
            "base64",
        );

        const filePath = await createTemporaryFile(
            "temporary-upload",
            pngBuffer,
        );

        await expect(
            inspectUploadedFileType({
                filePath,
                originalName: "illustration.png",
                declaredMimeType: "application/pdf",
            }),
        ).rejects.toMatchObject({
            statusCode: 415,
            message:
                "Le type déclaré du fichier ne correspond pas à son contenu.",
        });
    });

    it("refuse une extension différente du contenu réel", async () => {
        const pngBuffer = Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZzT8AAAAASUVORK5CYII=",
            "base64",
        );

        const filePath = await createTemporaryFile(
            "temporary-upload",
            pngBuffer,
        );

        await expect(
            inspectUploadedFileType({
                filePath,
                originalName: "illustration.jpg",
                declaredMimeType: "image/png",
            }),
        ).rejects.toMatchObject({
            statusCode: 415,
            message: "L'extension du fichier ne correspond pas à son contenu.",
        });
    });
});