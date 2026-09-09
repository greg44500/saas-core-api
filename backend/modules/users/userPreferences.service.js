import { USER_STATUS } from '../../constants/userStatus.constants.js';
import { AppError } from '../../utils/appError.js';
import { User } from './user.model.js';
import {
    DEFAULT_USER_COMFORT_PREFERENCES,
} from './userPreferences.constants.js';

const USER_COMFORT_PREFERENCE_KEYS = Object.freeze(
    Object.keys(DEFAULT_USER_COMFORT_PREFERENCES),
);

function normalizeUserComfortPreferences(comfortPreferences) {
    return {
        ...DEFAULT_USER_COMFORT_PREFERENCES,
        ...(comfortPreferences?.theme !== undefined
            ? { theme: comfortPreferences.theme }
            : {}),
        ...(comfortPreferences?.fontFamily !== undefined
            ? { fontFamily: comfortPreferences.fontFamily }
            : {}),
        ...(comfortPreferences?.paletteId !== undefined
            ? { paletteId: comfortPreferences.paletteId }
            : {}),
        ...(comfortPreferences?.accessibilityMode !== undefined
            ? { accessibilityMode: comfortPreferences.accessibilityMode }
            : {}),
    };
}

async function getCurrentUserPreferences({ userId }) {
    if (!userId) {
        throw new TypeError('userId is required to read current user preferences');
    }

    const user = await User.findOne({
        _id: userId,
        status: USER_STATUS.ACTIVE,
    });

    if (!user) {
        throw new AppError('Compte indisponible', 403);
    }

    return {
        comfort: normalizeUserComfortPreferences(user.preferences?.comfort),
    };
}

async function updateCurrentUserPreferences({ userId, comfort }) {
    if (!userId) {
        throw new TypeError('userId is required to update current user preferences');
    }

    const comfortEntries = USER_COMFORT_PREFERENCE_KEYS
        .filter((key) => comfort?.[key] !== undefined)
        .map((key) => [key, comfort[key]]);

    if (comfortEntries.length === 0) {
        throw new TypeError('at least one comfort preference is required');
    }

    const preferenceUpdates = Object.fromEntries(
        comfortEntries.map(([key, value]) => [
            `preferences.comfort.${key}`,
            value,
        ]),
    );

    const user = await User.findOneAndUpdate(
        {
            _id: userId,
            status: USER_STATUS.ACTIVE,
        },
        {
            $set: {
                ...preferenceUpdates,
                updatedBy: userId,
            },
        },
        {
            returnDocument: 'after',
            runValidators: true,
        },
    );

    if (!user) {
        throw new AppError('Compte indisponible', 403);
    }

    return {
        comfort: normalizeUserComfortPreferences(user.preferences?.comfort),
    };
}

export {
    getCurrentUserPreferences,
    normalizeUserComfortPreferences,
    updateCurrentUserPreferences,
};
