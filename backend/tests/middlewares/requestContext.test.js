import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';

import { requestContext } from '../../middlewares/requestContext.js';


describe('requestContext middleware', () => {
    it('ajoute le contexte technique à la requête', async () => {
        const testApp = express();

        testApp.use(requestContext);

        testApp.get('/test', (req, res) => {
            res.status(200).json(req.context);
        });

        const response = await request(testApp)
            .get('/test')
            .set('User-Agent', 'vitest-agent');

        expect(response.status).toBe(200);

        expect(response.body.requestId).toEqual(expect.any(String));
        expect(response.body.requestId).not.toHaveLength(0);

        expect(response.body.ipAddress).toEqual(expect.any(String));

        expect(response.body.userAgent).toBe('vitest-agent');
    });


    it('utilise null si aucun user-agent n’est disponible', () => {
        const req = {
            ip: '127.0.0.1',
            get: () => undefined,
        };

        const res = {};
        let nextCalled = false;

        const next = () => {
            nextCalled = true;
        };

        requestContext(req, res, next);

        expect(req.context.requestId).toEqual(expect.any(String));
        expect(req.context.ipAddress).toBe('127.0.0.1');
        expect(req.context.userAgent).toBeNull();
        expect(nextCalled).toBe(true);
    });
});