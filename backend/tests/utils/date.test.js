import { describe, expect, it } from 'vitest';

import { addDays } from '../../utils/date.js';

describe('date utils', () => {
    it('ajoute le nombre de jours demandé sans modifier la date initiale', () => {
        const initialDate = new Date('2026-08-09T12:00:00.000Z');

        const result = addDays(initialDate, 7);

        expect(result).toEqual(
            new Date('2026-08-16T12:00:00.000Z')
        );

        expect(initialDate).toEqual(
            new Date('2026-08-09T12:00:00.000Z')
        );
    });
});