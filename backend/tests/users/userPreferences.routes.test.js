import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { app } from '../../app.js';
import { authenticate } from '../../middlewares/authenticate.js';
import {
    getCurrentUserPreferences,
    updateCurrentUserPreferences,
} from '../../modules/users/userPreferences.service.js';

vi.mock('../../middlewares/authenticate.js', () => ({
    authenticate: vi.fn((req, res, next) => {
        req.user = { id: 'user-id' };
        next();
    }),
}));

vi.mock('../../modules/users/userPreferences.service.js', () => ({
    getCurrentUserPreferences: vi.fn(),
    updateCurrentUserPreferences: vi.fn(),
}));

describe('GET /api/users/me/preferences', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getCurrentUserPreferences.mockResolvedValue({
            comfort: {
                theme: 'system',
                fontFamily: 'inter',
                paletteId: 'core',
                accessibilityMode: 'standard',
            },
        });
    });

    it('protège et retourne uniquement les préférences courantes', async () => {
        const response = await request(app)
            .get('/api/users/me/preferences')
            .set('Authorization', 'Bearer test-token');

        expect(response.status).toBe(200);
        expect(authenticate).toHaveBeenCalled();
        expect(getCurrentUserPreferences).toHaveBeenCalledWith({
            userId: 'user-id',
        });
        expect(response.body.data.preferences.comfort).toEqual({
            theme: 'system',
            fontFamily: 'inter',
            paletteId: 'core',
            accessibilityMode: 'standard',
        });
    });
});

describe('PATCH /api/users/me/preferences', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        updateCurrentUserPreferences.mockResolvedValue({
            comfort: {
                theme: 'dark',
                fontFamily: 'inter',
                paletteId: 'core',
                accessibilityMode: 'standard',
            },
        });
    });

    it('valide strictement et met à jour une préférence contrôlée', async () => {
        const response = await request(app)
            .patch('/api/users/me/preferences')
            .set('Authorization', 'Bearer test-token')
            .send({
                comfort: {
                    theme: 'dark',
                },
            });

        expect(response.status).toBe(200);
        expect(updateCurrentUserPreferences).toHaveBeenCalledWith({
            userId: 'user-id',
            comfort: {
                theme: 'dark',
            },
        });
    });

    it('refuse une valeur CSS arbitraire comme palette', async () => {
        const response = await request(app)
            .patch('/api/users/me/preferences')
            .set('Authorization', 'Bearer test-token')
            .send({
                comfort: {
                    paletteId: '#ff0000',
                },
            });

        expect(response.status).toBe(400);
        expect(updateCurrentUserPreferences).not.toHaveBeenCalled();
    });

    it('refuse les champs non prévus', async () => {
        const response = await request(app)
            .patch('/api/users/me/preferences')
            .set('Authorization', 'Bearer test-token')
            .send({
                comfort: {
                    theme: 'light',
                    customCss: 'body { display: none; }',
                },
            });

        expect(response.status).toBe(400);
        expect(updateCurrentUserPreferences).not.toHaveBeenCalled();
    });

    it('refuse un objet comfort vide', async () => {
        const response = await request(app)
            .patch('/api/users/me/preferences')
            .set('Authorization', 'Bearer test-token')
            .send({ comfort: {} });

        expect(response.status).toBe(400);
        expect(updateCurrentUserPreferences).not.toHaveBeenCalled();
    });
});
