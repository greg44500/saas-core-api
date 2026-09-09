import { describe, expect, it } from 'vitest';

import {
    composeApplicationPaletteIds,
} from '../../config/applicationAppearance.registry.js';

describe('application appearance registry', () => {
    it('compose une palette dérivée avec la palette Core', () => {
        expect(composeApplicationPaletteIds([
            { paletteIds: ['brand-blue'] },
        ])).toEqual(['core', 'brand-blue']);
    });

    it('refuse les doublons de palette', () => {
        expect(() => composeApplicationPaletteIds([
            { paletteIds: ['core'] },
        ])).toThrow('Duplicate appearance palette id: core');
    });

    it('refuse un identifiant qui ressemble à une valeur CSS libre', () => {
        expect(() => composeApplicationPaletteIds([
            { paletteIds: ['#ff0000'] },
        ])).toThrow('Invalid appearance palette id: #ff0000');
    });
});
