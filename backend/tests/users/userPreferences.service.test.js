import { beforeEach, describe, expect, it, vi } from 'vitest';

import { User } from '../../modules/users/user.model.js';
import {
    DEFAULT_USER_COMFORT_PREFERENCES,
    DEFAULT_USER_DASHBOARD_PREFERENCES,
} from '../../modules/users/userPreferences.constants.js';
import {
    getCurrentUserPreferences,
    updateCurrentUserPreferences,
} from '../../modules/users/userPreferences.service.js';

vi.mock('../../modules/users/user.model.js', () => ({
    User: {
        findOne: vi.fn(),
        findOneAndUpdate: vi.fn(),
    },
}));

describe('current user preferences service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('normalise un compte historique sans préférences vers les defaults', async () => {
        User.findOne.mockResolvedValue({
            _id: 'user-id',
        });

        const result = await getCurrentUserPreferences({
            userId: 'user-id',
        });

        expect(result).toEqual({
            comfort: DEFAULT_USER_COMFORT_PREFERENCES,
            dashboard: DEFAULT_USER_DASHBOARD_PREFERENCES,
        });
    });

    it('met à jour uniquement les préférences de confort fournies', async () => {
        User.findOneAndUpdate.mockResolvedValue({
            _id: 'user-id',
            preferences: {
                comfort: {
                    theme: 'dark',
                    fontFamily: 'inter',
                    paletteId: 'core',
                    accessibilityMode: 'standard',
                },
            },
        });

        const result = await updateCurrentUserPreferences({
            userId: 'user-id',
            comfort: {
                theme: 'dark',
            },
        });

        expect(User.findOneAndUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ _id: 'user-id' }),
            {
                $set: {
                    'preferences.comfort.theme': 'dark',
                    updatedBy: 'user-id',
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
            },
        );
        expect(result.comfort.theme).toBe('dark');
        expect(result.dashboard).toEqual(DEFAULT_USER_DASHBOARD_PREFERENCES);
    });

    it('persiste uniquement la liste de widgets masqués demandée', async () => {
        User.findOneAndUpdate.mockResolvedValue({
            _id: 'user-id',
            preferences: {
                comfort: DEFAULT_USER_COMFORT_PREFERENCES,
                dashboard: {
                    hiddenWidgetIds: ['core.members', 'training.learners'],
                },
            },
        });

        const result = await updateCurrentUserPreferences({
            userId: 'user-id',
            dashboard: {
                hiddenWidgetIds: ['core.members', 'training.learners'],
            },
        });

        expect(User.findOneAndUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ _id: 'user-id' }),
            {
                $set: {
                    'preferences.dashboard.hiddenWidgetIds': [
                        'core.members',
                        'training.learners',
                    ],
                    updatedBy: 'user-id',
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
            },
        );
        expect(result.dashboard.hiddenWidgetIds).toEqual([
            'core.members',
            'training.learners',
        ]);
    });

    it('conserve un identifiant de widget inconnu mais syntaxiquement valide', async () => {
        User.findOneAndUpdate.mockResolvedValue({
            _id: 'user-id',
            preferences: {
                comfort: DEFAULT_USER_COMFORT_PREFERENCES,
                dashboard: {
                    hiddenWidgetIds: ['future-module.metric'],
                },
            },
        });

        const result = await updateCurrentUserPreferences({
            userId: 'user-id',
            dashboard: {
                hiddenWidgetIds: ['future-module.metric'],
            },
        });

        expect(result.dashboard.hiddenWidgetIds).toEqual([
            'future-module.metric',
        ]);
    });

    it('refuse une mise à jour sans préférence', async () => {
        await expect(
            updateCurrentUserPreferences({
                userId: 'user-id',
            }),
        ).rejects.toThrow('at least one user preference is required');

        expect(User.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('refuse la lecture lorsque le compte est indisponible', async () => {
        User.findOne.mockResolvedValue(null);

        await expect(
            getCurrentUserPreferences({ userId: 'user-id' }),
        ).rejects.toMatchObject({
            message: 'Compte indisponible',
            statusCode: 403,
        });
    });
});
