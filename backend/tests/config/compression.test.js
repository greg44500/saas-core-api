import { describe, expect, it } from 'vitest';
import express from 'express';
import compression from 'compression';
import request from 'supertest';

import { app } from '../../app.js';


describe('Compression HTTP', () => {
    it('ne compresse pas une petite réponse de l’application', async () => {
        const response = await request(app)
            .get('/api/health')
            .set('Accept-Encoding', 'gzip');

        expect(response.status).toBe(200);
        expect(response.headers['content-encoding']).toBeUndefined();
    });


    it('compresse une réponse suffisamment volumineuse', async () => {
        const testApp = express();

        testApp.use(compression());

        testApp.get('/large-response', (req, res) => {
            res.json({
                data: 'a'.repeat(2000),
            });
        });

        const response = await request(testApp)
            .get('/large-response')
            .set('Accept-Encoding', 'gzip');

        expect(response.status).toBe(200);
        expect(response.headers['content-encoding']).toBe('gzip');
    });
});