import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    FILE_SCAN_STATUS,
} from "../../../constants/file.constants.js";

import {
    AppError,
} from "../../../utils/appError.js";

import {
    createUploadedFileInspectionService,
} from "../../../services/fileInspection/uploadedFileInspection.service.js";

const FILE_PATH = "/temporary/uploaded-file";
const SCANNED_AT = new Date(
    "2026-08-18T14:00:00.000Z",
);

const createDependencies = () => ({
    inspectFileType: vi.fn().mockResolvedValue({
        mimeType: "application/pdf",
        extension: "pdf",
    }),

    calculateChecksum: vi.fn().mockResolvedValue(
        "a".repeat(64),
    ),

    scanFile: vi.fn().mockResolvedValue({
        status: FILE_SCAN_STATUS.CLEAN,
        provider: "clamav-local",
        scannedAt: SCANNED_AT,
        threatName: null,
        errorCode: null,
    }),

    discardTemporaryFile:
        vi.fn().mockResolvedValue({
            discarded: true,
        }),
});

const createInspectionParameters = () => ({
    filePath: FILE_PATH,
    originalName: "document.pdf",
    declaredMimeType: "application/pdf",
    sizeBytes: 1_024,
});

describe("Uploaded file inspection service", () => {
    it("retourne les métadonnées vérifiées lorsque toutes les étapes réussissent", async () => {
        const dependencies =
            createDependencies();

        const service =
            createUploadedFileInspectionService(
                dependencies,
            );

        const result =
            await service.inspectUploadedFile(
                createInspectionParameters(),
            );

        expect(
            dependencies.inspectFileType,
        ).toHaveBeenCalledWith({
            filePath: FILE_PATH,
            originalName: "document.pdf",
            declaredMimeType: "application/pdf",
        });

        expect(
            dependencies.calculateChecksum,
        ).toHaveBeenCalledWith(FILE_PATH);

        expect(
            dependencies.scanFile,
        ).toHaveBeenCalledWith({
            filePath: FILE_PATH,
        });

        /*
         * Un résultat sain reste dans la quarantaine jusqu'à ce que le futur
         * service de stockage le déplace vers son emplacement définitif.
         */
        expect(
            dependencies.discardTemporaryFile,
        ).not.toHaveBeenCalled();

        expect(result).toEqual({
            filePath: FILE_PATH,
            originalName: "document.pdf",
            sizeBytes: 1_024,
            mimeType: "application/pdf",
            extension: "pdf",
            checksumSha256: "a".repeat(64),
            malwareScan: {
                status: FILE_SCAN_STATUS.CLEAN,
                provider: "clamav-local",
                scannedAt: SCANNED_AT,
                threatName: null,
                errorCode: null,
            },
        });

        expect(Object.isFrozen(result))
            .toBe(true);
    });

    it("détruit le temporaire et renvoie un rejet générique lorsqu'une menace est détectée", async () => {
        const dependencies =
            createDependencies();

        dependencies.scanFile.mockResolvedValue({
            status: FILE_SCAN_STATUS.INFECTED,
            provider: "clamav-local",
            scannedAt: SCANNED_AT,
            threatName: "Internal.Test.Threat",
            errorCode: null,
        });

        const service =
            createUploadedFileInspectionService(
                dependencies,
            );

        await expect(
            service.inspectUploadedFile(
                createInspectionParameters(),
            ),
        ).rejects.toMatchObject({
            statusCode: 422,
            message:
                "Le fichier n’a pas pu être accepté. Le téléversement a été annulé.",
        });

        expect(
            dependencies.discardTemporaryFile,
        ).toHaveBeenCalledWith(FILE_PATH);
    });

    it("détruit le temporaire et renvoie une indisponibilité lorsque le scanner échoue", async () => {
        const dependencies =
            createDependencies();

        dependencies.scanFile.mockResolvedValue({
            status: FILE_SCAN_STATUS.ERROR,
            provider: "clamav-local",
            scannedAt: SCANNED_AT,
            threatName: null,
            errorCode: "CLAMAV_UNAVAILABLE",
        });

        const service =
            createUploadedFileInspectionService(
                dependencies,
            );

        await expect(
            service.inspectUploadedFile(
                createInspectionParameters(),
            ),
        ).rejects.toMatchObject({
            statusCode: 503,
            message:
                "Le fichier ne peut pas être traité pour le moment. Veuillez réessayer ultérieurement.",
        });

        expect(
            dependencies.discardTemporaryFile,
        ).toHaveBeenCalledWith(FILE_PATH);
    });

    it("nettoie le temporaire et propage l'erreur initiale lorsqu'une inspection échoue", async () => {
        const dependencies =
            createDependencies();

        const inspectionError = new AppError(
            "Le type réel du fichier n'est pas autorisé.",
            415,
        );

        dependencies.inspectFileType
            .mockRejectedValue(inspectionError);

        const service =
            createUploadedFileInspectionService(
                dependencies,
            );

        await expect(
            service.inspectUploadedFile(
                createInspectionParameters(),
            ),
        ).rejects.toBe(inspectionError);

        expect(
            dependencies.calculateChecksum,
        ).not.toHaveBeenCalled();

        expect(
            dependencies.scanFile,
        ).not.toHaveBeenCalled();

        expect(
            dependencies.discardTemporaryFile,
        ).toHaveBeenCalledWith(FILE_PATH);
    });

    it("conserve les deux erreurs lorsque le traitement et le nettoyage échouent", async () => {
        const dependencies =
            createDependencies();

        const processingError =
            new Error("Inspection failed");

        const cleanupError =
            new Error("Cleanup failed");

        dependencies.inspectFileType
            .mockRejectedValue(processingError);

        dependencies.discardTemporaryFile
            .mockRejectedValue(cleanupError);

        const service =
            createUploadedFileInspectionService(
                dependencies,
            );

        try {
            await service.inspectUploadedFile(
                createInspectionParameters(),
            );

            throw new Error(
                "Le service aurait dû rejeter la promesse.",
            );
        } catch (error) {
            expect(error)
                .toBeInstanceOf(AggregateError);

            expect(error.errors).toEqual([
                processingError,
                cleanupError,
            ]);

            expect(error.cause)
                .toBe(processingError);
        }
    });
});