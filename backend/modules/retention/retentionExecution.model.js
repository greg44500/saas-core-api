import mongoose from 'mongoose';

import {
    RETENTION_EXECUTION_STATUS,
    RETENTION_EXECUTION_TRIGGER,
} from '../../constants/retention.constants.js';
import {
    retentionPolicyConfigPersistenceSchema,
} from './retentionPolicyConfig.schema.js';


const { Schema, model } = mongoose;

const FORBIDDEN_QUERY_OPERATIONS = [
    'updateOne',
    'updateMany',
    'findOneAndUpdate',
    'replaceOne',
    'deleteOne',
    'deleteMany',
    'findOneAndDelete',
];

const IMMUTABLE_EXECUTION_PATHS = Object.freeze([
    'policy',
    'policyVersion',
    'policySnapshot',
    'trigger',
    'initiatedBy',
    'startedAt',
    'cutoffAt',
    'lease',
]);

const TERMINAL_EXECUTION_STATUSES = new Set([
    RETENTION_EXECUTION_STATUS.SUCCEEDED,
    RETENTION_EXECUTION_STATUS.FAILED,
]);

const isNonNegativeSafeInteger = (value) =>
    Number.isSafeInteger(value) && value >= 0;

const counterField = () => ({
    type: Number,
    required: true,
    default: 0,
    validate: {
        validator: isNonNegativeSafeInteger,
        message: 'Un compteur de rétention doit être un entier positif ou nul.',
    },
});

const retentionExecutionCountersSchema = new Schema(
    {
        selected: counterField(),
        processed: counterField(),
        affected: counterField(),
        skipped: counterField(),
        failed: counterField(),
    },
    {
        _id: false,
        strict: 'throw',
    },
);

const retentionExecutionLeaseSchema = new Schema(
    {
        leaseId: {
            type: String,
            required: true,
            trim: true,
            minlength: 16,
            maxlength: 128,
            match: [
                /^[a-zA-Z0-9_-]+$/,
                'lease.leaseId contient un format invalide.',
            ],
        },
        holderId: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            maxlength: 200,
        },
        acquiredAt: {
            type: Date,
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
    },
    {
        _id: false,
        strict: 'throw',
    },
);

/**
 * Trace durable d'une exécution réellement démarrée.
 *
 * Elle ne remplace pas le futur lock distribué : `lease` conserve seulement le
 * contexte technique du lock qui aura autorisé l'exécution. Aucune copie des
 * données ciblées ou supprimées n'est stockée ici.
 */
const retentionExecutionSchema = new Schema(
    {
        policy: {
            type: Schema.Types.ObjectId,
            ref: 'RetentionPolicy',
            required: true,
            immutable: true,
        },
        policyVersion: {
            type: Number,
            required: true,
            immutable: true,
            validate: {
                validator(value) {
                    return Number.isSafeInteger(value) && value > 0;
                },
                message:
                    'policyVersion doit être un entier strictement positif.',
            },
        },
        policySnapshot: {
            type: retentionPolicyConfigPersistenceSchema,
            required: true,
            immutable: true,
        },
        trigger: {
            type: String,
            enum: Object.values(RETENTION_EXECUTION_TRIGGER),
            required: true,
            immutable: true,
        },
        initiatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            immutable: true,
        },
        startedAt: {
            type: Date,
            required: true,
            immutable: true,
        },
        cutoffAt: {
            type: Date,
            required: true,
            immutable: true,
        },
        status: {
            type: String,
            enum: Object.values(RETENTION_EXECUTION_STATUS),
            default: RETENTION_EXECUTION_STATUS.RUNNING,
            required: true,
        },
        finishedAt: {
            type: Date,
            default: null,
        },
        counters: {
            type: retentionExecutionCountersSchema,
            default: () => ({}),
            required: true,
        },
        batchesProcessed: {
            type: Number,
            default: 0,
            required: true,
            validate: {
                validator: isNonNegativeSafeInteger,
                message:
                    'batchesProcessed doit être un entier positif ou nul.',
            },
        },
        lease: {
            type: retentionExecutionLeaseSchema,
            required: true,
            immutable: true,
        },
        errorCode: {
            type: String,
            default: null,
            trim: true,
            maxlength: 100,
            match: [
                /^[A-Z][A-Z0-9_]{2,99}$/,
                'errorCode doit être un code technique assaini.',
            ],
        },
    },
    {
        timestamps: true,
        optimisticConcurrency: true,
        strict: 'throw',
    },
);

retentionExecutionSchema.pre(
    'validate',
    function validateRetentionExecutionConsistency() {
        if (this.isNew && this.status !== RETENTION_EXECUTION_STATUS.RUNNING) {
            this.invalidate(
                'status',
                'Une exécution de rétention doit être créée avec le statut running.',
            );
        }

        if (!this.isNew) {
            for (const path of IMMUTABLE_EXECUTION_PATHS) {
                if (this.isModified(path)) {
                    this.invalidate(
                        path,
                        `Le champ ${path} d’une exécution de rétention est immuable.`,
                    );
                }
            }
        }

        if (this.policySnapshot?.enabled !== true) {
            this.invalidate(
                'policySnapshot',
                'Une exécution ne peut démarrer qu’avec une policy activée.',
            );
        }

        if (this.trigger === RETENTION_EXECUTION_TRIGGER.MANUAL) {
            if (!this.initiatedBy) {
                this.invalidate(
                    'initiatedBy',
                    'Une exécution manuelle doit conserver son initiateur.',
                );
            }

            if (this.policySnapshot?.manualExecutionEnabled !== true) {
                this.invalidate(
                    'policySnapshot',
                    'La policy n’autorise pas l’exécution manuelle.',
                );
            }
        }

        if (this.trigger === RETENTION_EXECUTION_TRIGGER.SCHEDULED) {
            if (this.initiatedBy !== null) {
                this.invalidate(
                    'initiatedBy',
                    'Une exécution planifiée utilise une identité technique et ne doit pas usurper un User.',
                );
            }

            if (this.policySnapshot?.schedule === null) {
                this.invalidate(
                    'policySnapshot',
                    'Une exécution planifiée nécessite une cadence configurée.',
                );
            }
        }

        if (
            this.startedAt instanceof Date
            && this.cutoffAt instanceof Date
            && this.cutoffAt >= this.startedAt
        ) {
            this.invalidate(
                'cutoffAt',
                'Le cutoff serveur doit être antérieur au démarrage de l’exécution.',
            );
        }

        if (
            this.lease?.acquiredAt instanceof Date
            && this.lease?.expiresAt instanceof Date
        ) {
            if (this.lease.expiresAt <= this.lease.acquiredAt) {
                this.invalidate(
                    'lease',
                    'La lease doit expirer après son acquisition.',
                );
            }

            if (
                this.startedAt instanceof Date
                && (
                    this.lease.acquiredAt > this.startedAt
                    || this.lease.expiresAt <= this.startedAt
                )
            ) {
                this.invalidate(
                    'lease',
                    'La lease doit couvrir le démarrage de l’exécution.',
                );
            }
        }

        const counters = this.counters;
        if (counters) {
            if (counters.processed > counters.selected) {
                this.invalidate(
                    'counters',
                    'processed ne peut pas dépasser selected.',
                );
            }

            const classifiedProcessed =
                counters.affected
                + counters.skipped
                + counters.failed;

            if (classifiedProcessed > counters.processed) {
                this.invalidate(
                    'counters',
                    'Les compteurs affectés, ignorés et échoués ne peuvent pas dépasser processed.',
                );
            }

            if (
                this.status === RETENTION_EXECUTION_STATUS.SUCCEEDED
                && (
                    counters.processed !== counters.selected
                    || classifiedProcessed !== counters.processed
                    || counters.failed !== 0
                )
            ) {
                this.invalidate(
                    'counters',
                    'Une exécution réussie doit classifier tous les éléments sélectionnés sans échec.',
                );
            }
        }

        if (
            this.policySnapshot
            && Number.isSafeInteger(this.batchesProcessed)
        ) {
            if (
                this.batchesProcessed
                > this.policySnapshot.maxBatchesPerRun
            ) {
                this.invalidate(
                    'batchesProcessed',
                    'Le nombre de lots traités dépasse la policy exécutée.',
                );
            }

            const maxSelectable =
                this.policySnapshot.batchSize
                * this.policySnapshot.maxBatchesPerRun;

            if (this.counters?.selected > maxSelectable) {
                this.invalidate(
                    'counters',
                    'Le nombre sélectionné dépasse les bornes de lots de la policy.',
                );
            }
        }

        const isTerminal = TERMINAL_EXECUTION_STATUSES.has(this.status);

        if (!isTerminal) {
            if (this.finishedAt !== null || this.errorCode !== null) {
                this.invalidate(
                    'status',
                    'Une exécution en cours ne peut pas avoir de fin ni de code d’erreur terminal.',
                );
            }
            return;
        }

        if (!(this.finishedAt instanceof Date)) {
            this.invalidate(
                'finishedAt',
                'Une exécution terminée doit conserver sa date de fin.',
            );
        } else if (
            this.startedAt instanceof Date
            && this.finishedAt < this.startedAt
        ) {
            this.invalidate(
                'finishedAt',
                'La fin de l’exécution ne peut pas précéder son démarrage.',
            );
        }

        if (
            this.status === RETENTION_EXECUTION_STATUS.SUCCEEDED
            && this.errorCode !== null
        ) {
            this.invalidate(
                'errorCode',
                'Une exécution réussie ne doit pas conserver de code d’erreur.',
            );
        }

        if (
            this.status === RETENTION_EXECUTION_STATUS.FAILED
            && this.errorCode === null
        ) {
            this.invalidate(
                'errorCode',
                'Une exécution échouée doit conserver un code d’erreur assaini.',
            );
        }
    },
);

retentionExecutionSchema.pre(
    FORBIDDEN_QUERY_OPERATIONS,
    function preventUnsafeExecutionMutation() {
        throw new Error(
            'Une RetentionExecution doit évoluer via document.save() et ne peut pas être modifiée ou supprimée par une mutation de requête.',
        );
    },
);

retentionExecutionSchema.index(
    {
        'policySnapshot.targetKey': 1,
        startedAt: -1,
    },
    {
        name: 'retention_execution_target_history',
    },
);
retentionExecutionSchema.index(
    {
        policy: 1,
        startedAt: -1,
    },
    {
        name: 'retention_execution_policy_history',
    },
);
retentionExecutionSchema.index(
    {
        status: 1,
        startedAt: -1,
    },
    {
        name: 'retention_execution_status_history',
    },
);


const RetentionExecution = model(
    'RetentionExecution',
    retentionExecutionSchema,
);


export {
    RetentionExecution,
    retentionExecutionCountersSchema,
    retentionExecutionLeaseSchema,
};
