import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../../app.js';
import { env } from '../../config/env.js';

describe('Configuration CORS', () => {
    it("autorise l'origine définie dans CLIENT_URL", async () => {
        const response = await request(app)
            .get('/api/health')
            .set('Origin', env.CLIENT_URL);

        expect(response.status).toBe(200);
        expect(response.headers['access-control-allow-origin']).toBe(
            env.CLIENT_URL,
        );
        expect(response.headers['access-control-allow-credentials']).toBe(
            'true',
        );
    });

    it("n'ajoute pas d'autorisation CORS pour une origine inconnue", async () => {
        const response = await request(app)
            .get('/api/health')
            .set('Origin', 'https://origine-inconnue.example');

        expect(response.status).toBe(200);
        expect(
            response.headers['access-control-allow-origin'],
        ).toBeUndefined();
        expect(
            response.headers['access-control-allow-credentials'],
        ).toBeUndefined();
    });

    it('répond correctement à une requête préflight autorisée', async () => {
        const response = await request(app)
            .options('/api/health')
            .set('Origin', env.CLIENT_URL)
            .set('Access-Control-Request-Method', 'GET')
            .set(
                'Access-Control-Request-Headers',
                'Content-Type,Authorization',
            );

        expect(response.status).toBe(204);
        expect(response.headers['access-control-allow-origin']).toBe(
            env.CLIENT_URL,
        );
        expect(response.headers['access-control-allow-credentials']).toBe(
            'true',
        );
        expect(response.headers['access-control-allow-methods']).toContain(
            'GET',
        );
        expect(response.headers['access-control-allow-headers']).toBe(
            'Content-Type,Authorization',
        );
    });
});