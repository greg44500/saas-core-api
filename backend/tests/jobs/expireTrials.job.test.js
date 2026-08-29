import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    runExpireTrialsJob,
} from '../../jobs/subscriptions/expireTrials.job.js';

import {
    expireExpiredTrials,
} from '../../modules/subscriptions/services/expireExpiredTrials.service.js';


vi.mock(
    '../../modules/subscriptions/services/expireExpiredTrials.service.js',
    () => ({
        expireExpiredTrials: vi.fn(),
    }),
);


describe('runExpireTrialsJob', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('délègue la logique métier au service et journalise le résultat', async () => {
        const now = new Date('2026-08-29T14:00:00.000Z');
        const result = {
            processedAt: now,
            scanned: 3,
            expired: 2,
            skipped: 1,
        };

        const logger = {
            info: vi.fn(),
            error: vi.fn(),
        };

        expireExpiredTrials.mockResolvedValue(result);

        await expect(
            runExpireTrialsJob({ now, logger }),
        ).resolves.toBe(result);

        expect(expireExpiredTrials).toHaveBeenCalledOnce();
        expect(expireExpiredTrials).toHaveBeenCalledWith({ now });
        expect(logger.info).toHaveBeenCalledWith(
            'Maintenance des trials commerciaux terminée.',
            result,
        );
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('journalise puis propage une erreur pour permettre le retry de l’ordonnanceur', async () => {
        const error = new Error('database unavailable');
        const logger = {
            info: vi.fn(),
            error: vi.fn(),
        };

        expireExpiredTrials.mockRejectedValue(error);

        await expect(
            runExpireTrialsJob({ logger }),
        ).rejects.toBe(error);

        expect(logger.info).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(
            'La maintenance des trials commerciaux a échoué.',
            {
                message: error.message,
            },
        );
    });

    it('refuse un logger incompatible avant d’appeler le service métier', async () => {
        await expect(
            runExpireTrialsJob({
                logger: {
                    info: vi.fn(),
                },
            }),
        ).rejects.toBeInstanceOf(TypeError);

        expect(expireExpiredTrials).not.toHaveBeenCalled();
    });
});
