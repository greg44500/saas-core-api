import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';

import {
    FILE_CATEGORY,
    FILE_SCAN_STATUS,
    FILE_STATUS,
    FILE_STORAGE_PROVIDER,
} from '../../constants/file.constants.js';

import { File } from '../../modules/file/file.model.js';


describe('File model', () => {
    const workspaceId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    /**
     * Construit les métadonnées minimales d'un fichier PDF valide.
     *
     * Les tests peuvent ensuite modifier uniquement les champs nécessaires
     * au scénario étudié.
     */
    const createFileData = (overrides = {}) => ({
        workspace: workspaceId,
        uploadedBy: userId,
        originalName: 'document.pdf',
        storedName: '550e8400-e29b-41d4-a716-446655440000.pdf',
        mimeType: 'application/pdf',
        extension: 'pdf',
        sizeBytes: 1024,
        storageProvider: FILE_STORAGE_PROVIDER.LOCAL,
        storageKey:
            `workspaces/${workspaceId}/550e8400-e29b-41d4-a716-446655440000.pdf`,
        checksumSha256: 'a'.repeat(64),
        category: FILE_CATEGORY.DOCUMENT,
        ...overrides,
    });


    it('crée un fichier en quarantaine avec une analyse en attente', async () => {
        const file = new File(createFileData());

        await file.validate();

        expect(file.status).toBe(FILE_STATUS.QUARANTINED);

        expect(file.malwareScan.status)
            .toBe(FILE_SCAN_STATUS.PENDING);

        expect(file.deletedAt).toBeNull();
        expect(file.deletedBy).toBeNull();
        expect(file.purgeScheduledAt).toBeNull();
        expect(file.purgedAt).toBeNull();
    });


    it('interdit d’activer un fichier sans verdict antivirus sain', async () => {
        const unsafeFile = new File(
            createFileData({
                status: FILE_STATUS.ACTIVE,
            }),
        );

        await expect(unsafeFile.validate()).rejects.toThrow(
            "Un fichier ne peut pas devenir actif avant une analyse antivirus réussie.",
        );


        const scannedAt = new Date('2026-08-17T12:00:00.000Z');

        const safeFile = new File(
            createFileData({
                status: FILE_STATUS.ACTIVE,
                malwareScan: {
                    status: FILE_SCAN_STATUS.CLEAN,
                    provider: 'clamav',
                    scannedAt,
                },
            }),
        );

        await expect(safeFile.validate()).resolves.toBeUndefined();

        expect(safeFile.malwareScan.scannedAt).toEqual(scannedAt);
    });


    it('impose le rejet d’un fichier déclaré infecté', async () => {
        const scannedAt = new Date('2026-08-17T12:00:00.000Z');

        const quarantinedInfectedFile = new File(
            createFileData({
                status: FILE_STATUS.QUARANTINED,
                malwareScan: {
                    status: FILE_SCAN_STATUS.INFECTED,
                    provider: 'clamav',
                    scannedAt,
                    threatName: 'Test.Signature',
                },
            }),
        );

        await expect(
            quarantinedInfectedFile.validate(),
        ).rejects.toThrow(
            'Un fichier infecté doit être rejeté.',
        );


        const rejectedFile = new File(
            createFileData({
                status: FILE_STATUS.REJECTED,
                malwareScan: {
                    status: FILE_SCAN_STATUS.INFECTED,
                    provider: 'clamav',
                    scannedAt,
                    threatName: 'Test.Signature',
                },
            }),
        );

        await expect(rejectedFile.validate())
            .resolves.toBeUndefined();
    });


    it('interdit une purge physique antérieure à la date planifiée', async () => {
        const deletedAt =
            new Date('2026-08-17T12:00:00.000Z');

        const purgeScheduledAt =
            new Date('2026-09-16T12:00:00.000Z');

        const invalidPurgedFile = new File(
            createFileData({
                status: FILE_STATUS.PURGED,
                deletedAt,
                deletedBy: userId,
                purgeScheduledAt,
                purgedAt:
                    new Date('2026-09-15T12:00:00.000Z'),
            }),
        );

        await expect(
            invalidPurgedFile.validate(),
        ).rejects.toThrow(
            'La purge physique ne peut pas précéder la date de purge planifiée.',
        );


        const validPurgedFile = new File(
            createFileData({
                status: FILE_STATUS.PURGED,
                deletedAt,
                deletedBy: userId,
                purgeScheduledAt,
                purgedAt:
                    new Date('2026-09-16T12:00:00.000Z'),
            }),
        );

        await expect(validPurgedFile.validate())
            .resolves.toBeUndefined();
    });
});