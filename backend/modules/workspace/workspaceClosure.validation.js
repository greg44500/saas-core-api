import { z } from 'zod';

import { passwordSchema } from '../auth/auth.validation.js';

const archiveWorkspaceBodySchema = z.strictObject({
    currentPassword: passwordSchema,
    confirmationName: z
        .string()
        .trim()
        .min(2)
        .max(120),
});

export { archiveWorkspaceBodySchema };
