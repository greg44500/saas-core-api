import mongoose from 'mongoose';
import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    RETENTION_EXECUTION_STATUS,
    RETENTION_EXECUTION_TRIGGER,
} from '../../constants/retention.constants.js';
import {
    RetentionExecution,
} from '../../modules/retention/retentionExecution.model.js';
import {
    RETENTION_POLICY_SCHEMA_VERSION,
} from '../../modules/retention/retentionPolicy.validation.js';
import {
    RETENTION_TARGET,
} from '../../modules/retention/retentionTarget.registry.js';


const STARTED_AT = new Date('2026-09-08T10:00:00.000Z');
const CUTOFF_AT = new Date('2025-09-08T10:00:00.000Z');

const createPolicySnapshot = (overrides = {}) => ({
    schemaVersion: RETENTION_POLICY_SCHEMA_VERSION,
    targetKey: RETENTION_TARGET.AUDIT_LOG,
    enabled: true,
    retentionDays: 365,
    batchSize: 100,
    maxBatchesPerRun: 10,
    schedule: {
        intervalMinutes: 1440,
    },
    manualExecutionEnabled: true,
    ...overrides,
});

const createLease = (overrides = {}) => ({
    leaseId: 'lease_0123456789abcdef',
    holderId: 'worker-01',
    acquiredAt: new Date('2026-09-08T09:59:00.000Z'),
    expiresAt: new Date('2026-09-08T10:10:00.000Z'),
    ...overrides,
});

const createScheduledExecution = (overrides = {}) =>
    new RetentionExecution({
        policy: new mongoose.Types.ObjectId(),
        policyVersion: 1,
        policySnapshot: createPolicySnapshot(),
        trigger: RETENTION_EXECUTION_TRIGGER.SCHEDULED,
        initiatedBy: null,
        startedAt: STARTED_AT,
        cutoffAt: CUTOFF_AT,
        lease: createLease(),
        ...overrides,
    });

const hydrateRunningExecution = (overrides = {}) =>
    RetentionExecution.hydrate({
        _id: new mongoose.Types.ObjectId(),
        policy: new mongoose.Types.ObjectId(),
        policyVersion: 1,
        policySnapshot: createPolicySnapshot(),
        trigger: RETENTION_EXECUTION_TRIGGER.SCHEDULED,
        initiatedBy: null,
        startedAt: STARTED_AT,
        cutoffAt: CUTOFF_AT,
        status: RETENTION_EXECUTION_STATUS.RUNNING,
        finishedAt: null,
        counters: {
            selected: 0,
            processed: 0,
            affected: 0,
            skipped: 0,
            failed: 0,
        },
        batchesProcessed: 0,
        lease: createLease(),
        errorCode: null,
        createdAt: STARTED_AT,
        updatedAt: STARTED_AT,
        __v: 0,
        ...overrides,
    });


describe('RetentionExecution model', () => {
    it('valide une exécution planifiée créée en running avec identité technique', async () => {
        const execution = createScheduledExecution();

        await expect(execution.validate()).resolves.toBeUndefined();

        expect(execution.initiatedBy).toBeNull();
        expect(execution.status).toBe(
            RETENTION_EXECUTION_STATUS.RUNNING,
        );
    });

    it('valide une exécution manuelle uniquement avec un initiateur explicite', async () => {
        const execution = createScheduledExecution({
            trigger: RETENTION_EXECUTION_TRIGGER.MANUAL,
            initiatedBy: new mongoose.Types.ObjectId(),
        });

        await expect(execution.validate()).resolves.toBeUndefined();
    });

    it('refuse une exécution manuelle sans initiateur', async () => {
        const execution = createScheduledExecution({
            trigger: RETENTION_EXECUTION_TRIGGER.MANUAL,
            initiatedBy: null,
        });

        await expect(execution.validate()).rejects.toThrow(
            'doit conserver son initiateur',
        );
    });

    it('refuse qu’une exécution planifiée usurpe un User', async () => {
        const execution = createScheduledExecution({
            initiatedBy: new mongoose.Types.ObjectId(),
        });

        await expect(execution.validate()).rejects.toThrow(
            'ne doit pas usurper un User',
        );
    });

    it('refuse une exécution basée sur une policy désactivée', async () => {
        const execution = createScheduledExecution({
            policySnapshot: createPolicySnapshot({
                enabled: false,
            }),
        });

        await expect(execution.validate()).rejects.toThrow(
            'policy activée',
        );
    });

    it('refuse une exécution planifiée sans cadence configurée', async () => {
        const execution = createScheduledExecution({
            policySnapshot: createPolicySnapshot({
                schedule: null,
            }),
        });

        await expect(execution.validate()).rejects.toThrow(
            'nécessite une cadence configurée',
        );
    });

    it('refuse une exécution manuelle lorsque la policy l’interdit', async () => {
        const execution = createScheduledExecution({
            trigger: RETENTION_EXECUTION_TRIGGER.MANUAL,
            initiatedBy: new mongoose.Types.ObjectId(),
            policySnapshot: createPolicySnapshot({
                manualExecutionEnabled: false,
            }),
        });

        await expect(execution.validate()).rejects.toThrow(
            'n’autorise pas l’exécution manuelle',
        );
    });

    it('refuse un cutoff qui n’est pas antérieur au démarrage', async () => {
        const execution = createScheduledExecution({
            cutoffAt: STARTED_AT,
        });

        await expect(execution.validate()).rejects.toThrow(
            'cutoff serveur doit être antérieur',
        );
    });

    it('refuse une lease qui ne couvre pas le démarrage', async () => {
        const execution = createScheduledExecution({
            lease: createLease({
                expiresAt: STARTED_AT,
            }),
        });

        await expect(execution.validate()).rejects.toThrow(
            'lease doit couvrir le démarrage',
        );
    });

    it('refuse des compteurs incompatibles', async () => {
        const execution = createScheduledExecution({
            counters: {
                selected: 5,
                processed: 6,
                affected: 5,
                skipped: 0,
                failed: 0,
            },
        });

        await expect(execution.validate()).rejects.toThrow(
            'processed ne peut pas dépasser selected',
        );
    });

    it('refuse de dépasser les bornes de lots de la policy snapshot', async () => {
        const execution = createScheduledExecution({
            batchesProcessed: 11,
        });

        await expect(execution.validate()).rejects.toThrow(
            'nombre de lots traités dépasse la policy',
        );
    });

    it('autorise la finalisation réussie cohérente d’une exécution existante', async () => {
        const execution = hydrateRunningExecution();

        execution.status = RETENTION_EXECUTION_STATUS.SUCCEEDED;
        execution.finishedAt = new Date('2026-09-08T10:02:00.000Z');
        execution.counters = {
            selected: 4,
            processed: 4,
            affected: 3,
            skipped: 1,
            failed: 0,
        };
        execution.batchesProcessed = 1;

        await expect(execution.validate()).resolves.toBeUndefined();
    });

    it('exige un code technique assaini pour une exécution échouée', async () => {
        const execution = hydrateRunningExecution();

        execution.status = RETENTION_EXECUTION_STATUS.FAILED;
        execution.finishedAt = new Date('2026-09-08T10:01:00.000Z');

        await expect(execution.validate()).rejects.toThrow(
            'doit conserver un code d’erreur assaini',
        );
    });

    it('refuse la création directe d’une trace déjà terminale', async () => {
        const execution = createScheduledExecution({
            status: RETENTION_EXECUTION_STATUS.SUCCEEDED,
            finishedAt: new Date('2026-09-08T10:01:00.000Z'),
        });

        await expect(execution.validate()).rejects.toThrow(
            'doit être créée avec le statut running',
        );
    });

    it('déclare les index nécessaires aux historiques de target, policy et statut', () => {
        const indexedFields = RetentionExecution.schema.indexes().map(
            ([fields]) => fields,
        );

        expect(indexedFields).toEqual(
            expect.arrayContaining([
                {
                    'policySnapshot.targetKey': 1,
                    startedAt: -1,
                },
                {
                    policy: 1,
                    startedAt: -1,
                },
                {
                    status: 1,
                    startedAt: -1,
                },
            ]),
        );
    });

    it('active l’optimistic concurrency pour protéger les sauvegardes concurrentes', () => {
        expect(
            RetentionExecution.schema.options.optimisticConcurrency,
        ).toBe(true);
    });

    it('bloque les mutations de requête qui contourneraient les invariants documentaires', async () => {
        await expect(
            RetentionExecution.updateOne(
                { _id: new mongoose.Types.ObjectId() },
                { $set: { status: RETENTION_EXECUTION_STATUS.FAILED } },
            ),
        ).rejects.toThrow('document.save()');
    });

    it('bloque les suppressions ordinaires de la trace durable', async () => {
        await expect(
            RetentionExecution.deleteOne({
                _id: new mongoose.Types.ObjectId(),
            }),
        ).rejects.toThrow('document.save()');
    });
});
