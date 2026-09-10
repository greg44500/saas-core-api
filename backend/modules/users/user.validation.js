import { z } from 'zod';

import {
    ACTIVE_APPEARANCE_PALETTE_IDS,
} from '../../config/applicationAppearance.registry.js';
import { passwordSchema } from '../../shared/validation/password.validation.js';
import {
    USER_ACCESSIBILITY_MODE,
    USER_FONT_FAMILY,
    USER_THEME,
} from './userPreferences.constants.js';

const userNameSchema = z.string().trim().min(1).max(100);
const dashboardWidgetIdSchema = z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);

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
        paletteId: z.enum(ACTIVE_APPEARANCE_PALETTE_IDS).optional(),
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

const userDashboardPreferencesInputSchema = z.strictObject({
    hiddenWidgetIds: z
        .array(dashboardWidgetIdSchema)
        .max(100)
        .refine(
            (widgetIds) => new Set(widgetIds).size === widgetIds.length,
            {
                message: 'Les identifiants de widgets masqués doivent être uniques.',
            },
        ),
});

const updateCurrentUserPreferencesSchema = z
    .strictObject({
        comfort: userComfortPreferencesInputSchema.optional(),
        dashboard: userDashboardPreferencesInputSchema.optional(),
    })
    .refine(
        (value) => value.comfort !== undefined || value.dashboard !== undefined,
        {
            message: 'Au moins une section de préférences doit être fournie.',
        },
    );

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
    userDashboardPreferencesInputSchema,
    userIdentityInputSchema,
};
