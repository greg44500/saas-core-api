import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../../app.js';
import { env } from '../../config/env.js';

describe('Configuration Helmet', () => {
    it('ajoute les principaux en-têtes de sécurité', async () => {
        const response = await request(app).get('/api/health');

        expect(response.status).toBe(200);
        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
        expect(response.headers['referrer-policy']).toBe('no-referrer');
        expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it("configure la mise à niveau HTTPS de la CSP selon l'environnement", async () => {
        const response = await request(app).get('/api/health');

        const contentSecurityPolicy =
            response.headers['content-security-policy'];

        expect(contentSecurityPolicy).toContain("default-src 'self'");

        if (env.NODE_ENV === 'production') {
            expect(contentSecurityPolicy).toContain(
                'upgrade-insecure-requests',
            );
        } else {
            expect(contentSecurityPolicy).not.toContain(
                'upgrade-insecure-requests',
            );
        }
    });

    it("configure HSTS selon l'environnement", async () => {
        const response = await request(app).get('/api/health');

        const strictTransportSecurity =
            response.headers['strict-transport-security'];

        if (env.NODE_ENV === 'production') {
            expect(strictTransportSecurity).toBe(
                'max-age=31536000; includeSubDomains',
            );
        } else {
            expect(strictTransportSecurity).toBeUndefined();
        }
    });
});