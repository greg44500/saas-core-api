import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    ensureMinimumDuration,
} from '../../utils/securityTiming.js';


describe('ensureMinimumDuration', () => {
    it('attend uniquement la durée restante avant le seuil cible', async () => {
        const wait = vi.fn()
            .mockResolvedValue(undefined);

        /*
         * startedAt = 1000
         * now() = 1200
         *
         * Le workflow a donc déjà consommé 200 ms.
         *
         * Avec un minimum de 700 ms :
         * 700 - 200 = 500 ms à attendre.
         */
        const result =
            await ensureMinimumDuration({
                startedAt: 1000,
                minimumMs: 700,
                jitterMs: 0,
                now: () => 1200,
                wait,
            });

        expect(wait).toHaveBeenCalledWith(
            500,
        );

        expect(result).toEqual({
            elapsedMs: 200,
            targetDurationMs: 700,
            waitedMs: 500,
        });
    });


    it('n’attend pas lorsque le traitement a déjà dépassé le seuil cible', async () => {
        const wait = vi.fn()
            .mockResolvedValue(undefined);

        /*
         * Le traitement a déjà duré 900 ms alors que
         * le seuil minimal demandé est de 700 ms.
         */
        const result =
            await ensureMinimumDuration({
                startedAt: 1000,
                minimumMs: 700,
                jitterMs: 0,
                now: () => 1900,
                wait,
            });

        expect(wait).not.toHaveBeenCalled();

        expect(result).toEqual({
            elapsedMs: 900,
            targetDurationMs: 700,
            waitedMs: 0,
        });
    });


    it('ajoute le jitter au seuil minimal', async () => {
        const wait = vi.fn()
            .mockResolvedValue(undefined);

        /*
         * random() = 0.5 et jitterMs = 100.
         *
         * Math.floor(0.5 * 101) = 50.
         *
         * Le seuil cible devient donc :
         * 700 + 50 = 750 ms.
         *
         * 200 ms se sont déjà écoulées :
         * il reste 550 ms.
         */
        const result =
            await ensureMinimumDuration({
                startedAt: 1000,
                minimumMs: 700,
                jitterMs: 100,
                now: () => 1200,
                random: () => 0.5,
                wait,
            });

        expect(wait).toHaveBeenCalledWith(
            550,
        );

        expect(result).toEqual({
            elapsedMs: 200,
            targetDurationMs: 750,
            waitedMs: 550,
        });
    });


    it('refuse une durée minimale invalide', async () => {
        await expect(
            ensureMinimumDuration({
                startedAt: 1000,
                minimumMs: -1,
            }),
        ).rejects.toThrow(TypeError);
    });
});