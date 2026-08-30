import { z } from 'zod';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';


const objectIdSchema = z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Identifiant invalide');

const isoDateTimeSchema = z.iso
    .datetime({ offset: true })
    .transform((value) => new Date(value));

const workspaceAuditLogQuerySchema = z
    .strictObject({
        page: z.coerce
            .number()
            .int()
            .min(1)
            .default(1),

        limit: z.coerce
            .number()
            .int()
            .min(1)
            .max(100)
            .default(20),

        action: z
            .enum(Object.values(AUDIT_ACTION))
            .optional(),

        actorId: objectIdSchema.optional(),

        entityType: z
            .enum(Object.values(AUDIT_ENTITY_TYPE))
            .optional(),

        status: z
            .enum(Object.values(AUDIT_STATUS))
            .optional(),

        from: isoDateTimeSchema.optional(),
        to: isoDateTimeSchema.optional(),
    })
    .refine(
        ({ from, to }) => !from || !to || from <= to,
        {
            message: 'from doit être antérieur ou égal à to',
            path: ['from'],
        },
    );


export {
    workspaceAuditLogQuerySchema,
};
