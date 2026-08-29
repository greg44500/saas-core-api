import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { applyScheduledDowngrades } from '../../modules/subscriptions/services/applyScheduledDowngrades.service.js';
import { runApplyScheduledDowngradesJob } from '../../jobs/subscriptions/applyScheduledDowngrades.job.js';

vi.mock('../../modules/subscriptions/services/applyScheduledDowngrades.service.js', () => ({
    applyScheduledDowngrades: vi.fn(),
}));

describe('runApplyScheduledDowngradesJob', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('délègue au service et journalise le résultat', async () => {
        const now = new Date('2026-10-01T00:00:00.000Z');
        const result = {
            processedAt: now,
            scanned: 2,
            applied: 2,
            skipped: 0,
        };
        const logger = {
            info: vi.fn(),
            error: vi.fn(),
        };
        applyScheduledDowngrades.mockResolvedValue(result);

        await expect(
            runApplyScheduledDowngradesJob({ now, logger }),
        ).resolves.toEqual(result);

        expect(applyScheduledDowngrades).toHaveBeenCalledWith({ now });
        expect(logger.info).toHaveBeenCalledWith(
            'Scheduled downgrades processed',
            result,
        );
    });

    it('journalise puis propage une erreur du service', async () => {
        const error = new Error('boom');
        const logger = {
            info: vi.fn(),
            error: vi.fn(),
        };
        applyScheduledDowngrades.mockRejectedValue(error);

        await expect(
            runApplyScheduledDowngradesJob({ logger }),
        ).rejects.toThrow('boom');

        expect(logger.error).toHaveBeenCalledWith(
            'Scheduled downgrade job failed',
            error,
        );
    });

    it('refuse un logger incomplet', async () => {
        await expect(
            runApplyScheduledDowngradesJob({ logger: {} }),
        ).rejects.toBeInstanceOf(TypeError);
    });
});
