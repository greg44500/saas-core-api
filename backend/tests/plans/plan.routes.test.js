import express from 'express';
import request from 'supertest';

import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    list,
} from '../../modules/plan/plan.controller.js';

import {
    planRouter,
} from '../../modules/plan/plan.routes.js';


vi.mock(
    '../../modules/plan/plan.controller.js',
    () => ({
        list: vi.fn((req, res) => {
            res.status(200).json({
                status: 'success',
                data: {
                    plans: [],
                },
            });
        }),
    }),
);


beforeEach(() => {
    list.mockClear();
});


describe('plan.routes', () => {
    it('expose publiquement la liste des plans', async () => {
        const app = express();

        app.use('/plans', planRouter);

        /*
         * Aucun cookie, token ou utilisateur simulé n'est fourni.
         * La réussite de la requête confirme le caractère public de la route.
         */
        const response = await request(app)
            .get('/plans');

        expect(response.status).toBe(200);

        expect(response.body).toEqual({
            status: 'success',
            data: {
                plans: [],
            },
        });

        expect(list).toHaveBeenCalledOnce();
    });
});