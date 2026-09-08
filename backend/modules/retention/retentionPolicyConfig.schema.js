import mongoose from 'mongoose';

import {
    validateRetentionPolicyConfig,
} from './retentionPolicy.validation.js';


const { Schema } = mongoose;

const RETENTION_TARGET_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

const retentionSchedulePersistenceSchema = new Schema(
    {
        intervalMinutes: {
            type: Number,
            required: true,
            validate: {
                validator: Number.isSafeInteger,
                message:
                    'schedule.intervalMinutes doit être un entier sûr.',
            },
        },
    },
    {
        _id: false,
        strict: 'throw',
    },
);

/**
 * Forme persistable exacte d'une configuration de rétention.
 *
 * Ce sous-schéma est partagé par RetentionPolicy et par le snapshot immuable
 * d'une RetentionExecution. La validation Zod D-019.2 reste l'autorité sur les
 * targets, capabilities et bornes code-owned ; Mongoose ajoute une seconde
 * barrière pour les écritures internes qui ne passent pas par une route HTTP.
 */
const retentionPolicyConfigPersistenceSchema = new Schema(
    {
        schemaVersion: {
            type: Number,
            required: true,
            validate: {
                validator: Number.isSafeInteger,
                message: 'schemaVersion doit être un entier sûr.',
            },
        },
        targetKey: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            match: [
                RETENTION_TARGET_KEY_PATTERN,
                'Le format de targetKey est invalide.',
            ],
        },
        enabled: {
            type: Boolean,
            required: true,
        },
        retentionDays: {
            type: Number,
            required: true,
            validate: {
                validator: Number.isSafeInteger,
                message: 'retentionDays doit être un entier sûr.',
            },
        },
        batchSize: {
            type: Number,
            required: true,
            validate: {
                validator: Number.isSafeInteger,
                message: 'batchSize doit être un entier sûr.',
            },
        },
        maxBatchesPerRun: {
            type: Number,
            required: true,
            validate: {
                validator: Number.isSafeInteger,
                message: 'maxBatchesPerRun doit être un entier sûr.',
            },
        },
        schedule: {
            type: retentionSchedulePersistenceSchema,
            default: null,
        },
        manualExecutionEnabled: {
            type: Boolean,
            required: true,
        },
    },
    {
        _id: false,
        strict: 'throw',
    },
);

retentionPolicyConfigPersistenceSchema.pre(
    'validate',
    function validateAgainstCodeOwnedRegistry() {
        const config = this.toObject({
            depopulate: true,
            getters: false,
            virtuals: false,
        });
        const result = validateRetentionPolicyConfig(config);

        if (result.success) {
            return;
        }

        const issue = result.error.issues[0];
        const path = issue?.path?.join('.') || 'targetKey';

        this.invalidate(
            path,
            issue?.message
                ?? 'La configuration de rétention persistée est invalide.',
        );
    },
);


export {
    retentionPolicyConfigPersistenceSchema,
    retentionSchedulePersistenceSchema,
};
