import { z } from 'zod';

import {
    ACTIVE_RETENTION_TARGET_REGISTRY,
} from '../../../config/applicationRetention.registry.js';


const platformRetentionTargetParamsSchema = z.strictObject({
    targetKey: z
        .string()
        .trim()
        .min(1)
        .refine(
            (targetKey) =>
                ACTIVE_RETENTION_TARGET_REGISTRY.hasTarget(targetKey),
            {
                message:
                    'La cible de rétention demandée n’existe pas.',
            },
        ),
});

const retentionScheduleBodySchema = z.strictObject({
    intervalMinutes: z
        .number()
        .int()
        .positive(),
});

/**
 * Le client ne choisit ni targetKey, ni schemaVersion, ni filtre/cutoff.
 * Ces éléments restent exclusivement construits ou résolus côté serveur.
 */
const createRetentionPolicyVersionBodySchema = z.strictObject({
    expectedVersion: z
        .number()
        .int()
        .positive()
        .nullable(),
    enabled: z.boolean(),
    retentionDays: z
        .number()
        .int()
        .positive(),
    batchSize: z
        .number()
        .int()
        .positive(),
    maxBatchesPerRun: z
        .number()
        .int()
        .positive(),
    schedule: retentionScheduleBodySchema.nullable(),
    manualExecutionEnabled: z.boolean(),
});

/**
 * La confirmation d'une exécution manuelle est liée à une preview précise.
 * Aucun cutoff n'est accepté : le moteur le recalcule depuis l'heure serveur.
 */
const executeRetentionPolicyBodySchema = z.strictObject({
    expectedPolicyVersion: z
        .number()
        .int()
        .positive(),
    expectedEligibleCount: z
        .number()
        .int()
        .nonnegative(),
    expectedMaxAffectedThisRun: z
        .number()
        .int()
        .nonnegative(),
    confirmation: z
        .string()
        .trim()
        .min(1)
        .max(120),
});


export {
    createRetentionPolicyVersionBodySchema,
    executeRetentionPolicyBodySchema,
    platformRetentionTargetParamsSchema,
};
