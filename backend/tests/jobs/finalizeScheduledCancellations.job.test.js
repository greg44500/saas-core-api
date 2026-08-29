import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    finalizeScheduledCancellations,
} from '../../modules/subscriptions/services/activeSubscriptionLifecycle.service.js';
import {
    runFinalizeScheduledCancellationsJob,
} from '../../jobs/subscriptions/finalizeScheduledCancellations.job.js';


vi.mock(
    '../../modules/subscriptions/services/activeSubscriptionLifecycle.service.js',
    () => ({
        finalizeScheduledCancellations: vi.fn(),
    }),
);


describe('runFinalizeScheduledCancellationsJob', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('délègue au service métier et journalise le résultat', async () => {
        const now = new Date('2026-08-29T12:00:00.000Z');
        const expected = {
            processedAt: now,
            scanned: 2,
            canceled: 2,
            skipped: 0,
        };
        const logger = {
            info: vi.fn(),
            error: vi.fn(),
        };

        finalizeScheduledCancellations.mockResolvedValue(expected);

        const result = await runFinalizeScheduledCancellationsJob({
            now,
            logger,
        });

        expect(finalizeScheduledCancellations).toHaveBeenCalledWith({ now });
        expect(logger.info).toHaveBeenCalledOnce();
        expect(logger.error).not.toHaveBeenCalled();
        expect(result).toBe(expected);
    });

    it('journalise puis propage les erreurs du service', async () => {
        const logger = {
            info: vi.fn(),
            error: vi.fn(),
        };
        const error = new Error('database unavailable');

        finalizeScheduledCancellations.mockRejectedValue(error);

        await expect(
            runFinalizeScheduledCancellationsJob({ logger }),
        ).rejects.toBe(error);

        expect(logger.error).toHaveBeenCalledWith(
            'La finalisation des annulations de souscriptions a échoué.',
            { message: 'database unavailable' },
        );
    });

    it('refuse un logger qui ne respecte pas le contrat attendu', async () => {
        await expect(
            runFinalizeScheduledCancellationsJob({
                logger: { info: vi.fn() },
            }),
        ).rejects.toThrow(
            'logger must expose info and error methods to finalize scheduled cancellations',
        );

        expect(finalizeScheduledCancellations).not.toHaveBeenCalled();
    });
});
