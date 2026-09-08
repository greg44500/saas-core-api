import { z } from 'zod';

import {
    ACTIVE_RETENTION_TARGET_REGISTRY,
} from '../../config/applicationRetention.registry.js';
import {
    RETENTION_CAPABILITY,
} from './retentionTarget.registry.js';


const RETENTION_POLICY_SCHEMA_VERSION = 1;

const scheduleSchema = z.strictObject({
    intervalMinutes: z
        .number()
        .int()
        .positive(),
});

const addRangeIssue = ({
    context,
    path,
    value,
    bound,
}) => {
    if (value >= bound.min && value <= bound.max) {
        return;
    }

    context.addIssue({
        code: 'custom',
        path,
        message:
            `La valeur doit être comprise entre ${bound.min} et ${bound.max}.`,
    });
};

/**
 * Construit le contrat Zod de configuration d'une policy de rétention.
 *
 * Le contrat est volontairement fermé : l'action destructive, la collection,
 * le filtre MongoDB, le cutoff et le prochain instant d'exécution ne sont pas
 * des données administrables. Ils seront résolus côté serveur depuis la cible
 * code-owned et l'état persistant du moteur.
 */
const createRetentionPolicyConfigSchema = (
    registry = ACTIVE_RETENTION_TARGET_REGISTRY,
) => {
    if (
        !registry
        || typeof registry.getTargetDefinition !== 'function'
    ) {
        throw new TypeError(
            'A retention target registry is required to validate a policy',
        );
    }

    return z
        .strictObject({
            schemaVersion: z.literal(
                RETENTION_POLICY_SCHEMA_VERSION,
            ),
            targetKey: z
                .string()
                .trim()
                .min(1),
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
            schedule: scheduleSchema.nullable(),
            manualExecutionEnabled: z.boolean(),
        })
        .superRefine((config, context) => {
            const target = registry.getTargetDefinition(
                config.targetKey,
            );

            if (!target) {
                context.addIssue({
                    code: 'custom',
                    path: ['targetKey'],
                    message:
                        'La cible de rétention n’existe pas dans le registre actif.',
                });
                return;
            }

            addRangeIssue({
                context,
                path: ['retentionDays'],
                value: config.retentionDays,
                bound: target.bounds.retentionDays,
            });
            addRangeIssue({
                context,
                path: ['batchSize'],
                value: config.batchSize,
                bound: target.bounds.batchSize,
            });
            addRangeIssue({
                context,
                path: ['maxBatchesPerRun'],
                value: config.maxBatchesPerRun,
                bound: target.bounds.maxBatchesPerRun,
            });

            if (config.schedule !== null) {
                if (
                    !target.capabilities.includes(
                        RETENTION_CAPABILITY.SCHEDULED_EXECUTION,
                    )
                ) {
                    context.addIssue({
                        code: 'custom',
                        path: ['schedule'],
                        message:
                            'Cette cible n’autorise pas l’exécution planifiée.',
                    });
                } else {
                    addRangeIssue({
                        context,
                        path: ['schedule', 'intervalMinutes'],
                        value: config.schedule.intervalMinutes,
                        bound:
                            target.bounds.scheduleIntervalMinutes,
                    });
                }
            }

            if (
                config.manualExecutionEnabled
                && !target.capabilities.includes(
                    RETENTION_CAPABILITY.MANUAL_EXECUTION,
                )
            ) {
                context.addIssue({
                    code: 'custom',
                    path: ['manualExecutionEnabled'],
                    message:
                        'Cette cible n’autorise pas l’exécution manuelle.',
                });
            }
        });
};

const retentionPolicyConfigSchema =
    createRetentionPolicyConfigSchema();

const validateRetentionPolicyConfig = (
    input,
    registry = ACTIVE_RETENTION_TARGET_REGISTRY,
) => createRetentionPolicyConfigSchema(registry).safeParse(input);


export {
    RETENTION_POLICY_SCHEMA_VERSION,
    createRetentionPolicyConfigSchema,
    retentionPolicyConfigSchema,
    validateRetentionPolicyConfig,
};
