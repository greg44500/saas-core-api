import { beforeEach, describe, expect, it, vi } from 'vitest';

import { User } from '../../modules/users/user.model.js';
import {
    DEFAULT_USER_COMFORT_PREFERENCES,
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

describe('current user comfort preferences service', () => {
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
        });
    });

    it('met à jour uniquement les préférences fournies', async () => {
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
    });

    it('refuse une mise à jour sans préférence', async () => {
        await expect(
            updateCurrentUserPreferences({
                userId: 'user-id',
                comfort: {},
            }),
        ).rejects.toThrow('at least one comfort preference is required');

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
