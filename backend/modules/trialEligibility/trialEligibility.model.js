import mongoose from 'mongoose';


const { Schema, model } = mongoose;


/**
 * Conserve la preuve qu'une identité commerciale a déjà bénéficié d'un trial.
 *
 * L'identité brute n'est volontairement pas conservée ici. `identityFingerprint`
 * est une empreinte HMAC déterministe calculée à partir de l'identité
 * canonique, afin de permettre une vérification future sans stocker l'email.
 */
const trialEligibilitySchema = new Schema(
    {
        identityFingerprint: {
            type: String,
            required: true,
            immutable: true,
            minlength: 64,
            maxlength: 64,
        },

        firstUser: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            immutable: true,
        },

        firstWorkspace: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            default: null,
            immutable: true,
        },

        firstSubscription: {
            type: Schema.Types.ObjectId,
            ref: 'Subscription',
            default: null,
            immutable: true,
        },

        consumedAt: {
            type: Date,
            required: true,
            default: Date.now,
            immutable: true,
        },
    },
    {
        timestamps: true,
    },
);


trialEligibilitySchema.index(
    {
        identityFingerprint: 1,
    },
    {
        unique: true,
        name: 'trial_identity_fingerprint_unique',
    },
);


const TrialEligibility = model(
    'TrialEligibility',
    trialEligibilitySchema,
);


export {
    TrialEligibility,
};