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
    platformCurrentContextRouter,
} from '../../modules/platform/currentContext/platformCurrentContext.routes.js';

const { getCurrent } = vi.hoisted(() => ({
    getCurrent: vi.fn((req, res) => res.status(200).json({
        status: 'success',
        data: {
            platformAccess: null,
        },
    })),
}));

vi.mock(
    '../../modules/platform/currentContext/platformCurrentContext.controller.js',
    () => ({ getCurrent }),
);

const app = express();
app.use('/platform/me', platformCurrentContextRouter);

beforeEach(() => {
    getCurrent.mockClear();
});


describe('platformCurrentContextRouter', () => {
    it('expose GET /platform/me sans middleware de permission dédié', async () => {
        const response = await request(app)
            .get('/platform/me');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            status: 'success',
            data: {
                platformAccess: null,
            },
        });
        expect(getCurrent).toHaveBeenCalledOnce();
    });
});
