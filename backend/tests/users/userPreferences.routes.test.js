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

const defaultPreferences = {
    comfort: {
        theme: 'system',
        fontFamily: 'inter',
        paletteId: 'core',
        accessibilityMode: 'standard',
    },
    dashboard: {
        hiddenWidgetIds: [],
    },
};

describe('GET /api/users/me/preferences', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getCurrentUserPreferences.mockResolvedValue(defaultPreferences);
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
        expect(response.body.data.preferences).toEqual(defaultPreferences);
    });
});

describe('PATCH /api/users/me/preferences', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        updateCurrentUserPreferences.mockResolvedValue({
            ...defaultPreferences,
            comfort: {
                ...defaultPreferences.comfort,
                theme: 'dark',
            },
        });
    });

    it('valide strictement et met à jour une préférence de confort contrôlée', async () => {
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
            dashboard: undefined,
        });
    });

    it('accepte une palette Core déclarée', async () => {
        const response = await request(app)
            .patch('/api/users/me/preferences')
            .set('Authorization', 'Bearer test-token')
            .send({
                comfort: {
                    paletteId: 'leafy-green-garden',
                },
            });

        expect(response.status).toBe(200);
        expect(updateCurrentUserPreferences).toHaveBeenCalledWith({
            userId: 'user-id',
            comfort: {
                paletteId: 'leafy-green-garden',
            },
            dashboard: undefined,
        });
    });

    it('met à jour les widgets masqués sans exiger une préférence de confort', async () => {
        const response = await request(app)
            .patch('/api/users/me/preferences')
            .set('Authorization', 'Bearer test-token')
            .send({
                dashboard: {
                    hiddenWidgetIds: ['core.members', 'future-module.metric'],
                },
            });

        expect(response.status).toBe(200);
        expect(updateCurrentUserPreferences).toHaveBeenCalledWith({
            userId: 'user-id',
            comfort: undefined,
            dashboard: {
                hiddenWidgetIds: ['core.members', 'future-module.metric'],
            },
        });
    });

    it('refuse les doublons et les identifiants de widgets hors contrat', async () => {
        const duplicateResponse = await request(app)
            .patch('/api/users/me/preferences')
            .set('Authorization', 'Bearer test-token')
            .send({
                dashboard: {
                    hiddenWidgetIds: ['core.members', 'core.members'],
                },
            });
        const invalidResponse = await request(app)
            .patch('/api/users/me/preferences')
            .set('Authorization', 'Bearer test-token')
            .send({
                dashboard: {
                    hiddenWidgetIds: ['<script>alert(1)</script>'],
                },
            });

        expect(duplicateResponse.status).toBe(400);
        expect(invalidResponse.status).toBe(400);
        expect(updateCurrentUserPreferences).not.toHaveBeenCalled();
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
                dashboard: {
                    hiddenWidgetIds: [],
                    customLayout: 'freeform',
                },
            });

        expect(response.status).toBe(400);
        expect(updateCurrentUserPreferences).not.toHaveBeenCalled();
    });

    it('refuse un objet comfort vide et un body vide', async () => {
        const comfortResponse = await request(app)
            .patch('/api/users/me/preferences')
            .set('Authorization', 'Bearer test-token')
            .send({ comfort: {} });
        const emptyResponse = await request(app)
            .patch('/api/users/me/preferences')
            .set('Authorization', 'Bearer test-token')
            .send({});

        expect(comfortResponse.status).toBe(400);
        expect(emptyResponse.status).toBe(400);
        expect(updateCurrentUserPreferences).not.toHaveBeenCalled();
    });
});
