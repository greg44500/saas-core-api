import { describe, expect, it } from 'vitest';

import { User } from '../../modules/users/user.model.js';
import {
    DEFAULT_USER_COMFORT_PREFERENCES,
} from '../../modules/users/userPreferences.constants.js';

function createUser(overrides = {}) {
    return new User({
        firstName: 'Greg',
        lastName: 'Ballat',
        email: 'greg@example.com',
        emailCanonical: 'greg@example.com',
        ...overrides,
    });
}

describe('User comfort preferences model', () => {
    it('applique des valeurs par défaut contrôlées aux nouveaux utilisateurs', async () => {
        const user = createUser();

        await user.validate();

        expect(user.preferences.comfort.toObject()).toEqual(
            DEFAULT_USER_COMFORT_PREFERENCES,
        );
    });

    it.each(['inter', 'geist', 'manrope', 'system'])(
        'accepte la police contrôlée %s',
        async (fontFamily) => {
            const user = createUser({
                preferences: {
                    comfort: {
                        theme: 'dark',
                        fontFamily,
                        paletteId: 'core',
                        accessibilityMode: 'enhanced',
                    },
                },
            });

            await expect(user.validate()).resolves.toBeUndefined();
        },
    );

    it.each([
        'core',
        'refreshing-summer-fun',
        'leafy-green-garden',
        'golden-peachy-glow',
    ])('accepte la palette Core contrôlée %s', async (paletteId) => {
        const user = createUser({
            preferences: {
                comfort: {
                    paletteId,
                },
            },
        });

        await expect(user.validate()).resolves.toBeUndefined();
    });

    it('refuse une palette arbitraire', async () => {
        const user = createUser({
            preferences: {
                comfort: {
                    paletteId: '#ff0000',
                },
            },
        });

        await expect(user.validate()).rejects.toThrow();
    });

    it('refuse un thème hors contrat', async () => {
        const user = createUser({
            preferences: {
                comfort: {
                    theme: 'sepia',
                },
            },
        });

        await expect(user.validate()).rejects.toThrow();
    });
});
