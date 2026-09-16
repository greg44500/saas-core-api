import { z } from 'zod';


const entryIdSchema = z
    .string()
    .regex(
        /^(workspace|platform)\.[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/,
        'entryId invalide',
    );

const workspaceHelpParamsSchema = z.strictObject({
    workspaceId: z
        .string()
        .regex(
            /^[a-f\d]{24}$/i,
            'workspaceId invalide',
        ),
});

const workspaceHelpEntryParamsSchema = z.strictObject({
    workspaceId: z
        .string()
        .regex(
            /^[a-f\d]{24}$/i,
            'workspaceId invalide',
        ),
    entryId: entryIdSchema,
});

const platformHelpEntryParamsSchema = z.strictObject({
    entryId: entryIdSchema,
});


export {
    platformHelpEntryParamsSchema,
    workspaceHelpEntryParamsSchema,
    workspaceHelpParamsSchema,
};
