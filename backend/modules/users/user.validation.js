import { z } from 'zod';

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

export {
    updateCurrentUserProfileSchema,
    userIdentityInputSchema,
};
