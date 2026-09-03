import mongoose from 'mongoose';

import {
    ENTITLEMENT_OVERRIDE_SOURCE,
    ENTITLEMENT_OVERRIDE_TARGET,
} from '../../constants/entitlementOverride.constants.js';


const { Schema, model } = mongoose;

const CAPABILITY_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

const isValidLimitValue = (value) =>
    value === null
    || (Number.isInteger(value) && value >= 0);

/**
 * Représente une exception commerciale appliquée à un Workspace sans modifier
 * le Plan catalogue ni la Subscription qui lui donne son socle contractuel.
 *
 * Un document ne cible volontairement qu'une seule capability afin que la
 * résolution effective, l'audit et la révocation restent déterministes.
 */
const entitlementOverrideSchema = new Schema(
    {
        workspace: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            required: true,
            immutable: true,
            index: true,
        },

        targetType: {
            type: String,
            enum: Object.values(ENTITLEMENT_OVERRIDE_TARGET),
            required: true,
            immutable: true,
        },

        featureKey: {
            type: String,
            trim: true,
            lowercase: true,
            match: [
                CAPABILITY_KEY_PATTERN,
                'Le format de la feature ciblée est invalide.',
            ],
            default: null,
            immutable: true,
        },

        metricKey: {
            type: String,
            trim: true,
            lowercase: true,
            match: [
                CAPABILITY_KEY_PATTERN,
                'Le format de la métrique ciblée est invalide.',
            ],
            default: null,
            immutable: true,
        },

        featureEnabled: {
            type: Boolean,
            default: null,
        },

        limitValue: {
            type: Number,
            default: null,
            validate: {
                validator: isValidLimitValue,
                message:
                    'La limite effective doit être nulle ou un entier positif ou nul.',
            },
        },

        source: {
            type: String,
            enum: Object.values(ENTITLEMENT_OVERRIDE_SOURCE),
            required: true,
        },

        startsAt: {
            type: Date,
            required: true,
            default: Date.now,
        },

        endsAt: {
            type: Date,
            default: null,
        },

        reason: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 500,
        },

        grantedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true,
        },

        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },

        revokedAt: {
            type: Date,
            default: null,
        },

        revokedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },

        revokeReason: {
            type: String,
            trim: true,
            minlength: 3,
            maxlength: 500,
            default: null,
        },
    },
    {
        timestamps: true,
    },
);

/**
 * Verrouille la forme discriminée du document au niveau persistance.
 * La validation HTTP sera également stricte, mais le modèle doit rester sûr
 * lorsqu'il est utilisé par un job, un seed ou un service interne.
 */
entitlementOverrideSchema.pre('validate', function validateTargetShape() {
    if (this.targetType === ENTITLEMENT_OVERRIDE_TARGET.FEATURE) {
        if (!this.featureKey) {
            this.invalidate(
                'featureKey',
                'Une dérogation de feature doit cibler une feature.',
            );
        }

        if (this.metricKey !== null) {
            this.invalidate(
                'metricKey',
                'Une dérogation de feature ne peut pas cibler une métrique.',
            );
        }

        if (typeof this.featureEnabled !== 'boolean') {
            this.invalidate(
                'featureEnabled',
                'Une dérogation de feature doit définir un état booléen.',
            );
        }

        if (this.limitValue !== null) {
            this.invalidate(
                'limitValue',
                'Une dérogation de feature ne peut pas définir de limite.',
            );
        }
    }

    if (this.targetType === ENTITLEMENT_OVERRIDE_TARGET.LIMIT) {
        if (!this.metricKey) {
            this.invalidate(
                'metricKey',
                'Une dérogation de limite doit cibler une métrique.',
            );
        }

        if (this.featureKey !== null) {
            this.invalidate(
                'featureKey',
                'Une dérogation de limite ne peut pas cibler une feature.',
            );
        }

        if (!isValidLimitValue(this.limitValue)) {
            this.invalidate(
                'limitValue',
                'Une dérogation de limite doit définir une valeur valide.',
            );
        }

        if (this.featureEnabled !== null) {
            this.invalidate(
                'featureEnabled',
                'Une dérogation de limite ne peut pas définir un état de feature.',
            );
        }
    }
});

/**
 * Une période nulle représente une dérogation durable explicitement voulue.
 * Lorsqu'une fin est fournie, elle doit être strictement postérieure au début.
 */
entitlementOverrideSchema.pre('validate', function validatePeriod() {
    if (this.endsAt !== null && this.endsAt <= this.startsAt) {
        this.invalidate(
            'endsAt',
            'La fin de la dérogation doit être postérieure à son début.',
        );
    }
});

/**
 * Une révocation est atomique : date, auteur et motif doivent apparaître
 * ensemble. Cela évite les documents partiellement révoqués impossibles à
 * interpréter correctement dans l'historique commercial.
 */
entitlementOverrideSchema.pre('validate', function validateRevocation() {
    const hasRevokedAt = this.revokedAt !== null;
    const hasRevokedBy = this.revokedBy !== null;
    const hasRevokeReason = this.revokeReason !== null;

    if (hasRevokedAt && (!hasRevokedBy || !hasRevokeReason)) {
        this.invalidate(
            'revokedAt',
            'Une révocation doit conserver son auteur et son motif.',
        );
    }

    if (!hasRevokedAt && (hasRevokedBy || hasRevokeReason)) {
        this.invalidate(
            'revokedAt',
            'Les données de révocation nécessitent une date de révocation.',
        );
    }
});

entitlementOverrideSchema.index({
    workspace: 1,
    targetType: 1,
    featureKey: 1,
    startsAt: -1,
});

entitlementOverrideSchema.index({
    workspace: 1,
    targetType: 1,
    metricKey: 1,
    startsAt: -1,
});

entitlementOverrideSchema.index({
    workspace: 1,
    revokedAt: 1,
    startsAt: 1,
    endsAt: 1,
});

const EntitlementOverride = model(
    'EntitlementOverride',
    entitlementOverrideSchema,
);

export { EntitlementOverride };
