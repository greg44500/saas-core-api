import { describe, expect, it } from 'vitest';

import {
    CORE_APPEARANCE_PALETTE_IDS,
    composeApplicationPaletteIds,
} from '../../config/applicationAppearance.registry.js';

describe('application appearance registry', () => {
    it('déclare les quatre palettes Core contrôlées', () => {
        expect(CORE_APPEARANCE_PALETTE_IDS).toEqual([
            'core',
            'refreshing-summer-fun',
            'leafy-green-garden',
            'golden-peachy-glow',
        ]);
    });

    it('compose une palette dérivée après les palettes Core', () => {
        expect(composeApplicationPaletteIds([
            { paletteIds: ['brand-blue'] },
        ])).toEqual([
            'core',
            'refreshing-summer-fun',
            'leafy-green-garden',
            'golden-peachy-glow',
            'brand-blue',
        ]);
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
