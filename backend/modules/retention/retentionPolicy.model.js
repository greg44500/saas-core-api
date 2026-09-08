import mongoose from 'mongoose';

import {
    retentionPolicyConfigPersistenceSchema,
} from './retentionPolicyConfig.schema.js';


const { Schema, model } = mongoose;

const APPEND_ONLY_QUERY_OPERATIONS = [
    'updateOne',
    'updateMany',
    'findOneAndUpdate',
    'replaceOne',
    'deleteOne',
    'deleteMany',
    'findOneAndDelete',
];

/**
 * Version immuable d'une policy de rétention.
 *
 * Une modification fonctionnelle ne réécrit jamais ce document : le futur
 * service de gouvernance créera la version suivante. La version la plus élevée
 * d'une target constitue ainsi la configuration courante sans effacer
 * l'historique des décisions antérieures.
 */
const retentionPolicySchema = new Schema(
    {
        version: {
            type: Number,
            required: true,
            immutable: true,
            validate: {
                validator(value) {
                    return Number.isSafeInteger(value) && value > 0;
                },
                message:
                    'version doit être un entier strictement positif.',
            },
        },
        config: {
            type: retentionPolicyConfigPersistenceSchema,
            required: true,
            immutable: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            immutable: true,
        },
    },
    {
        timestamps: {
            createdAt: true,
            updatedAt: false,
        },
        versionKey: false,
        strict: 'throw',
    },
);

retentionPolicySchema.pre('save', function preventExistingPolicySave() {
    if (!this.isNew) {
        throw new Error(
            'Une version de policy de rétention existante ne peut pas être modifiée.',
        );
    }
});

retentionPolicySchema.pre(
    APPEND_ONLY_QUERY_OPERATIONS,
    function preventRetentionPolicyMutation() {
        throw new Error(
            'Les versions de policy de rétention sont append-only et ne peuvent pas être modifiées ou supprimées.',
        );
    },
);

/**
 * Une target ne peut posséder qu'une seule occurrence d'un numéro de version.
 * L'index sert aussi la lecture de la version courante par parcours inverse.
 */
retentionPolicySchema.index(
    {
        'config.targetKey': 1,
        version: 1,
    },
    {
        unique: true,
        name: 'unique_retention_policy_target_version',
    },
);


const RetentionPolicy = model(
    'RetentionPolicy',
    retentionPolicySchema,
);


export { RetentionPolicy };
