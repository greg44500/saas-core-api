import { z } from 'zod';
import {
    PLATFORM_ROLE,
} from '../../constants/platformRoles.constants.js';
import {
    WORKSPACE_STATUS_REASON,
} from '../../constants/workspace.constants.js';

const platformUserIdParamsSchema = z.strictObject({
    userId: z
        .string()
        .regex(
            /^[a-f\d]{24}$/i,
            'userId invalide',
        ),
});

const disablePlatformUserBodySchema = z.strictObject({
    disabledReason: z
        .string()
        .trim()
        .min(
            3,
            'disabledReason doit contenir au minimum 3 caractères',
        )
        .max(
            500,
            'disabledReason ne peut pas dépasser 500 caractères',
        ),
});

const updatePlatformUserRoleBodySchema = z.strictObject({
    platformRole: z.enum(
        Object.values(PLATFORM_ROLE),
    ),
});

/**
 * Valide l'identifiant technique d'un workspace ciblé
 * depuis les routes d'administration Platform.
 *
 * La validation est volontairement locale au module Platform afin
 * d'éviter de coupler les routes administratives au module tenant.
 */
const platformWorkspaceIdParamsSchema = z.strictObject({
    workspaceId: z
        .string()
        .regex(
            /^[a-f\d]{24}$/i,
            'workspaceId invalide',
        ),
});

/**
 * Valide les informations nécessaires à la suspension
 * administrative d'un workspace.
 *
 * Un motif structuré est obligatoire afin que les décisions Platform
 * restent exploitables dans l'administration et dans l'AuditLog.
 *
 * Le motif OTHER impose une justification textuelle car sa valeur
 * structurée ne suffit pas à expliquer la décision.
 */
const suspendPlatformWorkspaceBodySchema = z
    .strictObject({
        statusReason: z.enum(
            Object.values(
                WORKSPACE_STATUS_REASON,
            ),
        ),

        statusReasonDetails: z
            .string()
            .trim()
            .min(3)
            .max(500)
            .optional(),
    })
    .superRefine(
        (
            data,
            context,
        ) => {
            if (
                data.statusReason
                === WORKSPACE_STATUS_REASON.OTHER
                && !data.statusReasonDetails
            ) {
                context.addIssue({
                    code: 'custom',
                    path: [
                        'statusReasonDetails',
                    ],
                    message:
                        'statusReasonDetails est requis lorsque statusReason vaut other',
                });
            }
        },
    );


export {
    disablePlatformUserBodySchema,
    platformUserIdParamsSchema,
    platformWorkspaceIdParamsSchema,
    updatePlatformUserRoleBodySchema,
    suspendPlatformWorkspaceBodySchema,
};