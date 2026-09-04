import mongoose from 'mongoose';

import {
    PLAN_STATUS,
    PLAN_SYSTEM_ROLE,
} from '../../constants/plan.constants.js';

const { Schema, model } = mongoose;

const PLAN_KEY_PATTERN = /^[a-z][a-z0-9_-]*$/;
const PLAN_CAPABILITY_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

const isNonNegativeInteger = (value) =>
    Number.isInteger(value) && value >= 0;

const isValidPlanLimit = (value) =>
    value === null || isNonNegativeInteger(value);

/**
 * Représente une offre commerciale disponible sur la plateforme.
 *
 * `_id` est l'identité MongoDB. `key` reste un identifiant technique interne,
 * stable et non piloté par l'interface Platform. `systemRole` porte les rares
 * responsabilités structurelles du Core, indépendamment du nom commercial.
 */
const planSchema = new Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            immutable: true,
            trim: true,
            lowercase: true,
            minlength: 2,
            maxlength: 64,
            match: [
                PLAN_KEY_PATTERN,
                'Le format de la clé du plan est invalide.',
            ],
        },

        /**
         * Rôle structurel réservé au système. `null` décrit un plan commercial
         * ordinaire. `baseline` identifie l'offre de référence de tout nouveau
         * workspace et ne peut être attribué qu'une seule fois.
         */
        systemRole: {
            type: String,
            enum: Object.values(PLAN_SYSTEM_ROLE),
            default: null,
            immutable: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 120,
        },

        description: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: null,
        },

        status: {
            type: String,
            enum: Object.values(PLAN_STATUS),
            default: PLAN_STATUS.ACTIVE,
            required: true,
        },

        isPublic: {
            type: Boolean,
            default: false,
            required: true,
        },

        displayOrder: {
            type: Number,
            default: 0,
            required: true,
            validate: {
                validator: isNonNegativeInteger,
                message:
                    'L’ordre d’affichage du plan doit être un entier positif ou nul.',
            },
        },

        trialEnabled: {
            type: Boolean,
            default: false,
            required: true,
        },

        trialDurationDays: {
            type: Number,
            default: null,
        },

        currency: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            minlength: 3,
            maxlength: 3,
            match: [
                /^[A-Z]{3}$/,
                'Le code devise du plan est invalide.',
            ],
        },

        priceMonthlyExclTaxMinor: {
            type: Number,
            required: true,
            validate: {
                validator: isNonNegativeInteger,
                message:
                    'Le prix mensuel HT doit être un entier positif ou nul.',
            },
        },

        priceYearlyExclTaxMinor: {
            type: Number,
            required: true,
            validate: {
                validator: isNonNegativeInteger,
                message:
                    'Le prix annuel HT doit être un entier positif ou nul.',
            },
        },

        features: {
            type: [
                {
                    type: String,
                    trim: true,
                    lowercase: true,
                    match: [
                        PLAN_CAPABILITY_KEY_PATTERN,
                        'Le format de la clé de fonctionnalité est invalide.',
                    ],
                },
            ],
            default: [],
            validate: {
                validator: (features) =>
                    new Set(features).size === features.length,
                message:
                    'Les fonctionnalités du plan ne doivent pas contenir de doublons.',
            },
        },

        limits: {
            type: Map,
            of: {
                type: Number,
                validate: {
                    validator: isValidPlanLimit,
                    message:
                        'Une limite de plan doit être un entier positif ou nul.',
                },
            },
            default: () => new Map(),
            validate: {
                validator: (limits) => {
                    if (!(limits instanceof Map)) {
                        return false;
                    }

                    return [...limits.keys()].every((key) =>
                        PLAN_CAPABILITY_KEY_PATTERN.test(key),
                    );
                },
                message:
                    'Le format de clé de limite du plan est invalide.',
            },
        },

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            immutable: true,
        },

        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    {
        timestamps: true,
    },
);

/**
 * Les plans créés depuis Platform n'exposent plus la génération d'une clé à
 * l'humain. Mongoose attribue `_id` avant la validation : il fournit donc une
 * base unique, stable et indépendante du nom commercial.
 */
planSchema.pre('validate', function assignInternalKey() {
    if (this.isNew && !this.key) {
        this.key = `plan_${this._id.toString()}`;
    }
});

planSchema.pre('validate', function validateTrialConfiguration() {
    if (!this.trialEnabled) {
        if (this.trialDurationDays !== null) {
            this.invalidate(
                'trialDurationDays',
                'La durée du trial doit être nulle lorsque le trial est désactivé.',
            );
        }

        return;
    }

    if (
        !Number.isInteger(this.trialDurationDays)
        || this.trialDurationDays <= 0
    ) {
        this.invalidate(
            'trialDurationDays',
            'La durée du trial doit être un entier strictement positif lorsque le trial est activé.',
        );
    }
});

planSchema.index(
    { systemRole: 1 },
    {
        name: 'uniq_plan_system_role',
        unique: true,
        partialFilterExpression: {
            systemRole: { $type: 'string' },
        },
    },
);

planSchema.index({
    status: 1,
    isPublic: 1,
    displayOrder: 1,
});

planSchema.index({
    status: 1,
    createdAt: -1,
});

const Plan = model('Plan', planSchema);

export { Plan };
