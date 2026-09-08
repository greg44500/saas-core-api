import mongoose from 'mongoose';
import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    RETENTION_POLICY_SCHEMA_VERSION,
} from '../../modules/retention/retentionPolicy.validation.js';
import {
    RetentionPolicy,
} from '../../modules/retention/retentionPolicy.model.js';
import {
    RETENTION_TARGET,
} from '../../modules/retention/retentionTarget.registry.js';


const createValidConfig = (overrides = {}) => ({
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

const createValidPolicy = (overrides = {}) => new RetentionPolicy({
    version: 1,
    config: createValidConfig(),
    createdBy: new mongoose.Types.ObjectId(),
    ...overrides,
});


describe('RetentionPolicy model', () => {
    it('valide une version de policy conforme au registre code-owned', async () => {
        const policy = createValidPolicy();

        await expect(policy.validate()).resolves.toBeUndefined();

        expect(policy.config.targetKey).toBe(
            RETENTION_TARGET.AUDIT_LOG,
        );
    });

    it('refuse une version non strictement positive', async () => {
        const policy = createValidPolicy({
            version: 0,
        });

        await expect(policy.validate()).rejects.toThrow(
            'version doit être un entier strictement positif',
        );
    });

    it('refuse une configuration hors des bornes de la target', async () => {
        const policy = createValidPolicy({
            config: createValidConfig({
                batchSize: 501,
            }),
        });

        await expect(policy.validate()).rejects.toThrow(
            'comprise entre 1 et 500',
        );
    });

    it('refuse une target absente du registre actif', async () => {
        const policy = createValidPolicy({
            config: createValidConfig({
                targetKey: 'unknown_target',
            }),
        });

        await expect(policy.validate()).rejects.toThrow(
            'n’existe pas dans le registre actif',
        );
    });

    it('déclare uniquement createdAt afin de préserver une version append-only', () => {
        expect(RetentionPolicy.schema.path('createdAt')).toBeDefined();
        expect(RetentionPolicy.schema.path('updatedAt')).toBeUndefined();
    });

    it('verrouille une version par target avec un index unique', () => {
        const index = RetentionPolicy.schema.indexes().find(
            ([fields]) =>
                fields['config.targetKey'] === 1
                && fields.version === 1,
        );

        expect(index).toBeDefined();
        expect(index[1]).toEqual(
            expect.objectContaining({
                unique: true,
                name: 'unique_retention_policy_target_version',
            }),
        );
    });

    it('bloque les mises à jour ordinaires d’une version existante', async () => {
        await expect(
            RetentionPolicy.updateOne(
                { _id: new mongoose.Types.ObjectId() },
                { $set: { version: 2 } },
            ),
        ).rejects.toThrow('append-only');
    });

    it('bloque les suppressions ordinaires des versions de policy', async () => {
        await expect(
            RetentionPolicy.deleteOne({
                _id: new mongoose.Types.ObjectId(),
            }),
        ).rejects.toThrow('append-only');
    });
});
