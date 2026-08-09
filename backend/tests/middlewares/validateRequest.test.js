import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { validateRequest } from '../../middlewares/validateRequest.js';

describe('validateRequest', () => {
    it('place les données validées dans req.validated', () => {
        const schema = z.strictObject({
            name: z.string(),
        });

        const req = {
            body: {
                name: 'Greg',
            },
        };

        const res = {};
        const next = vi.fn();

        validateRequest({ body: schema })(req, res, next);

        expect(req.validated).toEqual({
            body: {
                name: 'Greg',
            },
        });

        expect(next).toHaveBeenCalledWith();
    });
});