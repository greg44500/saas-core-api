import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    createTemporaryFileMaintenanceService,
} from "../../services/storage/temporaryFileMaintenance.service.js";


const ONE_HOUR_MS =
    60 * 60 * 1000;


describe("Temporary file maintenance service", () => {
    let logger;


    beforeEach(() => {
        /*
         * Le faux journaliseur vérifie la stratégie de remontée des résultats
         * sans polluer la sortie de Vitest.
         */
        logger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        };
    });


    it("exécute la purge avec la durée configurée", async () => {
        const cleanupResult = {
            inspected: 3,
            discarded: 2,
            retained: 1,
            missing: 0,
            failed: 0,
            failures: [],
        };

        const purgeOrphanTemporaryFiles = vi
            .fn()
            .mockResolvedValue(cleanupResult);

        const maintenanceService =
            createTemporaryFileMaintenanceService({
                temporaryFiles: {
                    purgeOrphanTemporaryFiles,
                },
                minimumAgeMs: ONE_HOUR_MS,
                logger,
            });

        await expect(
            maintenanceService.runStartupCleanup(),
        ).resolves.toEqual({
            completed: true,
            cleanupResult,
        });

        expect(
            purgeOrphanTemporaryFiles,
        ).toHaveBeenCalledOnce();

        expect(
            purgeOrphanTemporaryFiles,
        ).toHaveBeenCalledWith({
            minimumAgeMs: ONE_HOUR_MS,
        });

        expect(logger.info).toHaveBeenCalledWith(
            "La purge des fichiers temporaires est terminée.",
            {
                inspected: 3,
                discarded: 2,
                retained: 1,
                missing: 0,
                failed: 0,
            },
        );

        expect(logger.warn).not.toHaveBeenCalled();
        expect(logger.error).not.toHaveBeenCalled();
    });


    it("journalise les anomalies sans considérer toute la purge comme échouée", async () => {
        const cleanupResult = {
            inspected: 2,
            discarded: 1,
            retained: 0,
            missing: 0,
            failed: 1,
            failures: [
                {
                    fileName: "unexpected-directory",
                    code: null,
                    message:
                        "La ressource temporaire doit être un fichier ordinaire.",
                },
            ],
        };

        const maintenanceService =
            createTemporaryFileMaintenanceService({
                temporaryFiles: {
                    purgeOrphanTemporaryFiles:
                        vi.fn().mockResolvedValue(
                            cleanupResult,
                        ),
                },
                minimumAgeMs: ONE_HOUR_MS,
                logger,
            });

        await expect(
            maintenanceService.runStartupCleanup(),
        ).resolves.toEqual({
            completed: true,
            cleanupResult,
        });

        expect(logger.warn).toHaveBeenCalledWith(
            "La purge des fichiers temporaires s'est terminée avec des anomalies.",
            {
                inspected: 2,
                discarded: 1,
                retained: 0,
                missing: 0,
                failed: 1,
                failures:
                    cleanupResult.failures,
            },
        );

        expect(logger.info).not.toHaveBeenCalled();
        expect(logger.error).not.toHaveBeenCalled();
    });


    it("absorbe une erreur globale afin de ne pas bloquer le démarrage", async () => {
        const cleanupError = Object.assign(
            new Error(
                "Le répertoire temporaire est inaccessible.",
            ),
            {
                code: "EACCES",
            },
        );

        const maintenanceService =
            createTemporaryFileMaintenanceService({
                temporaryFiles: {
                    purgeOrphanTemporaryFiles:
                        vi.fn().mockRejectedValue(
                            cleanupError,
                        ),
                },
                minimumAgeMs: ONE_HOUR_MS,
                logger,
            });

        await expect(
            maintenanceService.runStartupCleanup(),
        ).resolves.toEqual({
            completed: false,
            error: cleanupError,
        });

        expect(logger.error).toHaveBeenCalledWith(
            "La purge des fichiers temporaires n'a pas pu être exécutée.",
            {
                code: "EACCES",
                message:
                    "Le répertoire temporaire est inaccessible.",
            },
        );

        expect(logger.info).not.toHaveBeenCalled();
        expect(logger.warn).not.toHaveBeenCalled();
    });
});