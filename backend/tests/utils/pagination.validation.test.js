import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    paginationQuerySchema,
} from '../../utils/validations/pagination.validation.js';


describe('paginationQuerySchema', () => {
    it('applique les valeurs par défaut', () => {
        const result = paginationQuerySchema.parse({});

        expect(result).toEqual({
            page: 1,
            limit: 20,
        });
    });

    it('convertit les paramètres query en nombres', () => {
        const result = paginationQuerySchema.parse({
            page: '2',
            limit: '50',
        });

        expect(result).toEqual({
            page: 2,
            limit: 50,
        });
    });

    it('refuse une pagination hors limites', () => {
        expect(() => paginationQuerySchema.parse({
            page: '0',
            limit: '101',
        })).toThrow();
    });
});