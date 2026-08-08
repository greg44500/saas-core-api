import { z } from 'zod';
export const userIdentityInputSchema = z.strictObject({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: z.email().max(254),
});