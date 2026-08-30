import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

const {
    purgeDeletedFilesMock,
} = vi.hoisted(() => ({
    purgeDeletedFilesMock: vi.fn(),
}));

vi.mock('../../modules/file/filePurge.service.js', () => ({
    purgeDeletedFiles: purgeDeletedFilesMock,
}));

import {
    runPurgeDeletedFilesJob,
} from '../../jobs/files/purgeDeletedFiles.job.js';

beforeEach(() => {
    vi.clearAllMocks();
});

describe('runPurgeDeletedFilesJob', () => {
    it('journalise et retourne le résultat du service de purge', async () => {
        const now = new Date('2026-09-30T12:00:00.000Z');
        const logger = {
            info: vi.fn(),
            error: vi.fn(),
        };
        const expected = {
            selected: 2,
            purged: 2,
            skipped: 0,
        };

        purgeDeletedFilesMock.mockResolvedValue(expected);

        const result = await runPurgeDeletedFilesJob({
            now,
            batchSize: 50,
            logger,
        });

        expect(purgeDeletedFilesMock).toHaveBeenCalledWith({
            now,
            batchSize: 50,
        });
        expect(logger.info).toHaveBeenCalledWith(
            'Maintenance de purge des fichiers terminée.',
            expected,
        );
        expect(logger.error).not.toHaveBeenCalled();
        expect(result).toBe(expected);
    });

    it('journalise puis propage une erreur pour que l’ordonnanceur puisse réagir', async () => {
        const logger = {
            info: vi.fn(),
            error: vi.fn(),
        };
        const error = new Error('purge failed');

        purgeDeletedFilesMock.mockRejectedValue(error);

        await expect(runPurgeDeletedFilesJob({ logger }))
            .rejects.toBe(error);

        expect(logger.error).toHaveBeenCalledWith(
            'La maintenance de purge des fichiers a échoué.',
            { message: 'purge failed' },
        );
    });
});
