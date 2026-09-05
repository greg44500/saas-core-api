import { z } from 'zod';
import { WORKSPACE_STATUS_REASON } from '../../../constants/workspace.constants.js';

const platformWorkspaceIdParamsSchema = z.strictObject({
    workspaceId: z.string().regex(/^[a-f\d]{24}$/i, 'workspaceId invalide'),
});

const createWorkspaceStatusReasonSchema = () => z
    .strictObject({
        statusReason: z.enum(Object.values(WORKSPACE_STATUS_REASON)),
        statusReasonDetails: z.string().trim().min(3).max(500).optional(),
    })
    .superRefine((data, context) => {
        if (
            data.statusReason === WORKSPACE_STATUS_REASON.OTHER
            && !data.statusReasonDetails
        ) {
            context.addIssue({
                code: 'custom',
                path: ['statusReasonDetails'],
                message:
                    'statusReasonDetails est requis lorsque statusReason vaut other',
            });
        }
    });

const suspendPlatformWorkspaceBodySchema =
    createWorkspaceStatusReasonSchema();

const closePlatformWorkspaceBodySchema =
    createWorkspaceStatusReasonSchema();

export {
    closePlatformWorkspaceBodySchema,
    platformWorkspaceIdParamsSchema,
    suspendPlatformWorkspaceBodySchema,
};
