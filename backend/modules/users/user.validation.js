import { z } from 'zod';

import { passwordSchema } from '../../shared/validation/password.validation.js';
import {
    USER_ACCESSIBILITY_MODE,
    USER_FONT_FAMILY,
    USER_PALETTE,
    USER_THEME,
} from './userPreferences.constants.js';

const userNameSchema = z.string().trim().min(1).max(100);

const userIdentityInputSchema = z.strictObject({
    firstName: userNameSchema,
    lastName: userNameSchema,
    email: z.email().max(254),
});

const updateCurrentUserProfileSchema = z
    .strictObject({
        firstName: userNameSchema.optional(),
        lastName: userNameSchema.optional(),
    })
    .refine(
        (value) => (
            value.firstName !== undefined
            || value.lastName !== undefined
        ),
        {
            message: 'Au moins un champ de profil doit être fourni.',
        },
    );

const userComfortPreferencesInputSchema = z
    .strictObject({
        theme: z.enum(Object.values(USER_THEME)).optional(),
        fontFamily: z.enum(Object.values(USER_FONT_FAMILY)).optional(),
        paletteId: z.enum(Object.values(USER_PALETTE)).optional(),
        accessibilityMode: z
            .enum(Object.values(USER_ACCESSIBILITY_MODE))
            .optional(),
    })
    .refine(
        (value) => Object.values(value).some((entry) => entry !== undefined),
        {
            message: 'Au moins une préférence de confort doit être fournie.',
        },
    );

const updateCurrentUserPreferencesSchema = z.strictObject({
    comfort: userComfortPreferencesInputSchema,
});

const requestCurrentUserClosureSchema = z.strictObject({
    currentPassword: passwordSchema,
    confirmationEmail: z.email().max(254),
    confirmAccountClosure: z.literal(true),
});

export {
    requestCurrentUserClosureSchema,
    updateCurrentUserPreferencesSchema,
    updateCurrentUserProfileSchema,
    userComfortPreferencesInputSchema,
    userIdentityInputSchema,
};
