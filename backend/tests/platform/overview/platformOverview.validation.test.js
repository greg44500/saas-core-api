import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    platformOverviewQuerySchema,
} from '../../../modules/platform/overview/platformOverview.validation.js';

describe('platformOverview.validation', () => {
    it('accepte une requête vide pour utiliser la période par défaut', () => {
        const result = platformOverviewQuerySchema.parse({});

        expect(result).toEqual({});
    });

    it('coerce une période explicite valide', () => {
        const result = platformOverviewQuerySchema.parse({
            from: '2026-08-01T00:00:00.000Z',
            to: '2026-09-01T00:00:00.000Z',
        });

        expect(result.from).toEqual(new Date('2026-08-01T00:00:00.000Z'));
        expect(result.to).toEqual(new Date('2026-09-01T00:00:00.000Z'));
    });

    it('refuse une seule borne de période', () => {
        expect(() => platformOverviewQuerySchema.parse({
            from: '2026-08-01T00:00:00.000Z',
        })).toThrow();
    });

    it('refuse une période inversée', () => {
        expect(() => platformOverviewQuerySchema.parse({
            from: '2026-09-01T00:00:00.000Z',
            to: '2026-08-01T00:00:00.000Z',
        })).toThrow();
    });

    it('refuse une période supérieure à un an d’analyse', () => {
        expect(() => platformOverviewQuerySchema.parse({
            from: '2025-01-01T00:00:00.000Z',
            to: '2026-09-01T00:00:00.000Z',
        })).toThrow();
    });

    it('refuse les paramètres inconnus', () => {
        expect(() => platformOverviewQuerySchema.parse({
            range: '30d',
        })).toThrow();
    });
});
