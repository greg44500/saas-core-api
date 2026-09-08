import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    ACTIVE_RETENTION_TARGET_REGISTRY,
} from '../../config/applicationRetention.registry.js';
import {
    RETENTION_ACTION,
    RETENTION_CAPABILITY,
    RETENTION_TARGET,
    createRetentionTargetRegistry,
} from '../../modules/retention/retentionTarget.registry.js';
import {
    RETENTION_POLICY_SCHEMA_VERSION,
    createRetentionPolicyConfigSchema,
    retentionPolicyConfigSchema,
} from '../../modules/retention/retentionPolicy.validation.js';


const validAuditLogPolicy = Object.freeze({
    schemaVersion: RETENTION_POLICY_SCHEMA_VERSION,
    targetKey: RETENTION_TARGET.AUDIT_LOG,
    enabled: true,
    retentionDays: 365,
    batchSize: 100,
    maxBatchesPerRun: 10,
    schedule: {
        intervalMinutes: 1440,
    },
    manualExecutionEnabled: false,
});


describe('retention policy validation', () => {
    it('accepte une configuration AuditLog entièrement explicite', () => {
        const result = retentionPolicyConfigSchema.safeParse(
            validAuditLogPolicy,
        );

        expect(result.success).toBe(true);
        expect(result.data).toEqual(validAuditLogPolicy);
    });

    it('refuse toute cible absente du registre code-owned', () => {
        const result = retentionPolicyConfigSchema.safeParse({
            ...validAuditLogPolicy,
            targetKey: 'users',
        });

        expect(result.success).toBe(false);
    });

    it('refuse les primitives permettant une requête destructive arbitraire', () => {
        for (const forbiddenField of [
            ['collection', 'auditlogs'],
            ['filter', { status: 'success' }],
            ['cutoff', '2026-01-01T00:00:00.000Z'],
            ['action', 'deleteMany'],
            ['nextRunAt', '2026-09-09T00:00:00.000Z'],
        ]) {
            const [field, value] = forbiddenField;
            const result = retentionPolicyConfigSchema.safeParse({
                ...validAuditLogPolicy,
                [field]: value,
            });

            expect(result.success).toBe(false);
        }
    });

    it('ne coerce pas les valeurs numériques fournies par le client', () => {
        const result = retentionPolicyConfigSchema.safeParse({
            ...validAuditLogPolicy,
            retentionDays: '365',
        });

        expect(result.success).toBe(false);
    });

    it('applique les bornes techniques code-owned de la cible', () => {
        const target =
            ACTIVE_RETENTION_TARGET_REGISTRY.getTargetDefinition(
                RETENTION_TARGET.AUDIT_LOG,
            );

        const invalidConfigs = [
            {
                ...validAuditLogPolicy,
                retentionDays: target.bounds.retentionDays.max + 1,
            },
            {
                ...validAuditLogPolicy,
                batchSize: target.bounds.batchSize.max + 1,
            },
            {
                ...validAuditLogPolicy,
                maxBatchesPerRun:
                    target.bounds.maxBatchesPerRun.max + 1,
            },
            {
                ...validAuditLogPolicy,
                schedule: {
                    intervalMinutes:
                        target.bounds.scheduleIntervalMinutes.min - 1,
                },
            },
        ];

        for (const config of invalidConfigs) {
            expect(
                retentionPolicyConfigSchema.safeParse(config).success,
            ).toBe(false);
        }
    });

    it('refuse un mode d’exécution non supporté par la cible', () => {
        const registry = createRetentionTargetRegistry({
            targets: [
                {
                    key: 'preview_only',
                    label: 'Preview uniquement',
                    description:
                        'Cible de test sans exécution planifiée ou manuelle.',
                    action: RETENTION_ACTION.DELETE,
                    capabilities: [
                        RETENTION_CAPABILITY.PREVIEW,
                    ],
                    bounds: {
                        retentionDays: { min: 1, max: 1000 },
                        batchSize: { min: 1, max: 100 },
                        maxBatchesPerRun: { min: 1, max: 10 },
                        scheduleIntervalMinutes: {
                            min: 60,
                            max: 10080,
                        },
                    },
                },
            ],
        });
        const schema = createRetentionPolicyConfigSchema(registry);

        const scheduled = schema.safeParse({
            ...validAuditLogPolicy,
            targetKey: 'preview_only',
        });
        const manual = schema.safeParse({
            ...validAuditLogPolicy,
            targetKey: 'preview_only',
            schedule: null,
            manualExecutionEnabled: true,
        });

        expect(scheduled.success).toBe(false);
        expect(manual.success).toBe(false);
    });

    it('exige la version exacte du contrat de configuration', () => {
        const result = retentionPolicyConfigSchema.safeParse({
            ...validAuditLogPolicy,
            schemaVersion: 2,
        });

        expect(result.success).toBe(false);
    });
});
